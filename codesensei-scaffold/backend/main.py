from dotenv import load_dotenv
import os
import base64
from pathlib import PurePosixPath
from urllib.parse import quote, urlparse

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analyzer import analyze_repository
from setup_analyzer import analyze_setup
from issue_finder import find_first_task
from relationship_analyzer import analyze_relationships
from complexity_analyzer import analyze_complexity

load_dotenv(override=True)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
# ---------------------------------------------------------
# APP
# ---------------------------------------------------------

app = FastAPI(title="CodeSensei API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# REQUEST MODELS
# ---------------------------------------------------------

class RepositoryRequest(BaseModel):
    url: str


class AskRequest(BaseModel):
    url: str
    question: str


# ---------------------------------------------------------
# GITHUB HELPERS
# ---------------------------------------------------------

def github_headers() -> dict:
    return {
        "Accept": "application/vnd.github+json",
        "User-Agent": "CodeSensei",
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def parse_github_url(url: str) -> tuple[str, str]:
    parsed = urlparse(url.strip())

    if parsed.netloc.lower() not in {
        "github.com",
        "www.github.com",
    }:
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid GitHub repository URL.",
        )

    parts = [
        part
        for part in parsed.path.strip("/").split("/")
        if part
    ]

    if len(parts) < 2:
        raise HTTPException(
            status_code=400,
            detail="GitHub URL must look like https://github.com/owner/repository",
        )

    owner = parts[0]
    repo = parts[1].removesuffix(".git")

    if not owner or not repo:
        raise HTTPException(
            status_code=400,
            detail="Could not determine the GitHub owner and repository.",
        )

    return owner, repo


def github_get(endpoint: str):
    url = f"https://api.github.com{endpoint}"

    response = requests.get(
        url,
        headers=github_headers(),
        timeout=30,
    )

    if response.status_code == 403:
        remaining = response.headers.get("X-RateLimit-Remaining")

        if remaining == "0":
            raise HTTPException(
                status_code=429,
                detail=(
                    "GitHub API rate limit reached. "
                    "Please wait for the limit to reset before "
                    "running another repository analysis."
                ),
            )

    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail="GitHub repository or requested resource was not found.",
        )

    if not response.ok:
        raise HTTPException(
            status_code=response.status_code,
            detail=(
                f"GitHub API request failed: "
                f"{response.status_code} {response.text[:300]}"
            ),
        )

    return response.json()


# ---------------------------------------------------------
# REPOSITORY INGESTION
# ---------------------------------------------------------

def fetch_repository_metadata(
    owner: str,
    repo: str,
) -> dict:
    return github_get(
        f"/repos/{quote(owner)}/{quote(repo)}"
    )


def fetch_repository_tree(
    owner: str,
    repo: str,
    branch: str,
) -> list[dict]:
    encoded_branch = quote(branch, safe="")

    data = github_get(
        f"/repos/{quote(owner)}/{quote(repo)}"
        f"/git/trees/{encoded_branch}?recursive=1"
    )

    tree = data.get("tree", [])

    return [
        item
        for item in tree
        if item.get("type") == "blob"
    ]


IGNORED_PATH_PARTS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    "__pycache__",
    ".venv",
    "venv",
}


def is_ignored_path(path: str) -> bool:
    parts = PurePosixPath(path).parts

    return any(
        part in IGNORED_PATH_PARTS
        for part in parts
    )


def filter_repository_files(
    tree: list[dict],
) -> list[dict]:
    files = []

    for item in tree:
        path = item.get("path", "")

        if not path:
            continue

        if is_ignored_path(path):
            continue

        files.append(
            {
                "path": path,
                "size": item.get("size", 0),
                "sha": item.get("sha"),
                "type": item.get("type", "blob"),
            }
        )

    return files


TEXT_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".go",
    ".rs",
    ".php",
    ".rb",
    ".cs",
    ".html",
    ".css",
    ".scss",
    ".sass",
    ".json",
    ".md",
    ".txt",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".cfg",
    ".conf",
    ".sql",
    ".xml",
    ".sh",
    ".bat",
    ".ps1",
}


TEXT_FILENAMES = {
    "README",
    "README.md",
    "README.txt",
    "LICENSE",
    "Dockerfile",
    "Makefile",
    ".gitignore",
    ".dockerignore",
    ".env.example",
    "requirements.txt",
    "pyproject.toml",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
}


def is_text_file(path: str) -> bool:
    filename = PurePosixPath(path).name

    if filename in TEXT_FILENAMES:
        return True

    suffix = PurePosixPath(path).suffix.lower()

    return suffix in TEXT_EXTENSIONS


def fetch_file_content(
    owner: str,
    repo: str,
    path: str,
) -> str | None:
    if not is_text_file(path):
        return None

    encoded_path = quote(path, safe="/")

    data = github_get(
        f"/repos/{quote(owner)}/{quote(repo)}"
        f"/contents/{encoded_path}"
    )

    if data.get("type") != "file":
        return None

    encoded_content = data.get("content")

    if not encoded_content:
        return None

    try:
        decoded = base64.b64decode(
            encoded_content.replace("\n", "")
        )

        content = decoded.decode(
            "utf-8",
            errors="replace",
        )

        # Protect the analyzer from extremely large files.
        return content[:500_000]

    except Exception:
        return None


def load_repository(url: str) -> dict:
    owner, repo = parse_github_url(url)

    metadata = fetch_repository_metadata(
        owner,
        repo,
    )

    default_branch = metadata.get(
        "default_branch",
        "main",
    )

    tree = fetch_repository_tree(
        owner,
        repo,
        default_branch,
    )

    files = filter_repository_files(tree)

    file_contents: dict[str, str] = {}

    # Keep the repository analysis manageable.
    # Files are already filtered to remove generated/vendor folders.
    for file in files:
        path = file["path"]

        content = fetch_file_content(
            owner,
            repo,
            path,
        )

        if content is not None:
            file_contents[path] = content

    repository = {
        "url": url,
        "owner": owner,
        "name": repo,
        "default_branch": default_branch,
        "description": metadata.get("description"),
        "language": metadata.get("language"),
        "stars": metadata.get("stargazers_count", 0),
        "forks": metadata.get("forks_count", 0),
    }

    return {
        "repository": repository,
        "files": files,
        "file_contents": file_contents,
    }


# ---------------------------------------------------------
# BASIC ROUTES
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "name": "CodeSensei API",
        "status": "online",
        "message": "Repository intelligence backend is running.",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "CodeSensei API",
    }


# ---------------------------------------------------------
# REPOSITORY ANALYSIS
# ---------------------------------------------------------

@app.post("/analyze")
def analyze(request: RepositoryRequest):
    repository_data = load_repository(
        request.url
    )

    files = repository_data["files"]
    file_contents = repository_data["file_contents"]

    analysis = analyze_repository(
        files
    )

    # NEW:
    # Analyze actual imports/dependencies between files.
    relationships = analyze_relationships(
        files,
        file_contents,
    )

    return {
        "repository": repository_data["repository"],
        "analysis": analysis,
        "content_files_loaded": len(file_contents),
        "analyzed_files": files,

        # Real code relationships detected from source content.
        "relationships": relationships,
        "relationship_count": len(relationships),
    }


# ---------------------------------------------------------
# SETUP ANALYSIS
# ---------------------------------------------------------

@app.post("/setup")
def setup(request: RepositoryRequest):
    repository_data = load_repository(
        request.url
    )

    setup_result = analyze_setup(
        repository_data["files"],
        repository_data["file_contents"],
    )

    return {
        "repository": repository_data["repository"],
        **setup_result,
    }
# ---------------------------------------------------------
# COMPLEXITY ANALYSIS
# ---------------------------------------------------------

@app.post("/complexity")
def complexity(request: RepositoryRequest):
    repository_data = load_repository(
        request.url
    )

    complexity_result = analyze_complexity(
        repository_data["files"],
        repository_data["file_contents"],
    )

    return {
        "repository": repository_data["repository"],
        **complexity_result,
    }


# ---------------------------------------------------------
# FIRST TASK
# ---------------------------------------------------------

@app.post("/first-task")
def first_task(request: RepositoryRequest):
    repository_data = load_repository(
        request.url
    )

    repository = repository_data["repository"]
    result = find_first_task(
        repository["owner"],
        repository["name"],
        repository_data["files"],
)
    

    return {
        "repository": repository,
        **result,
    }


# ---------------------------------------------------------
# REPOSITORY Q&A
# ---------------------------------------------------------

STOP_WORDS = {
    "where",
    "what",
    "when",
    "which",
    "who",
    "how",
    "is",
    "are",
    "the",
    "a",
    "an",
    "in",
    "on",
    "of",
    "to",
    "for",
    "and",
    "or",
    "with",
    "this",
    "that",
    "does",
    "do",
    "it",
    "file",
    "files",
    "defined",
    "located",
    "show",
    "tell",
    "me",
}


def extract_keywords(question: str) -> list[str]:
    words = question.lower().split()

    cleaned = []

    for word in words:
        word = word.strip(
            ".,?!:;()[]{}\"'"
        )

        if len(word) < 2:
            continue

        if word in STOP_WORDS:
            continue

        cleaned.append(word)

    return list(dict.fromkeys(cleaned))


def score_file(
    path: str,
    content: str,
    keywords: list[str],
) -> int:
    lower_path = path.lower()
    lower_content = content.lower()

    score = 0

    for keyword in keywords:
        if keyword in lower_path:
            score += 10

        occurrences = lower_content.count(keyword)

        if occurrences:
            score += min(
                occurrences * 2,
                20,
            )

    return score


def find_evidence(
    file_contents: dict[str, str],
    keywords: list[str],
) -> list[dict]:
    candidates = []

    for path, content in file_contents.items():
        score = score_file(
            path,
            content,
            keywords,
        )

        if score <= 0:
            continue

        lines = content.splitlines()

        matching_lines = []

        for index, line in enumerate(lines):
            lower_line = line.lower()

            if any(
                keyword in lower_line
                for keyword in keywords
            ):
                matching_lines.append(
                    index
                )

        if matching_lines:
            line_index = matching_lines[0]

            start = max(
                0,
                line_index - 1,
            )

            end = min(
                len(lines),
                line_index + 3,
            )

            snippet = "\n".join(
                lines[start:end]
            )

            candidates.append(
                {
                    "path": path,
                    "score": score,
                    "snippet": snippet[:1200],
                    "line_start": start + 1,
                    "line_end": end,
                }
            )
        else:
            candidates.append(
                {
                    "path": path,
                    "score": score,
                    "snippet": content[:1200],
                    "line_start": 1,
                    "line_end": min(
                        len(lines),
                        10,
                    ),
                }
            )

    candidates.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    return candidates[:5]


def answer_repository_question(
    question: str,
    file_contents: dict[str, str],
) -> dict:
    keywords = extract_keywords(
        question
    )

    evidence = find_evidence(
        file_contents,
        keywords,
    )

    if not evidence:
        return {
            "answer": (
                "I could not find strong evidence for that question "
                "in the loaded repository files."
            ),
            "confidence": "low",
            "keywords_used": keywords,
            "evidence": [],
        }

    strongest = evidence[0]

    path = strongest["path"]

    question_lower = question.lower()

    if (
        "ui" in question_lower
        or "interface" in question_lower
        or "frontend" in question_lower
    ):
        answer = (
            f"The strongest repository evidence points to "
            f"`{path}` as a relevant UI/frontend file. "
            f"The cited section contains code matching the "
            f"terms from your question."
        )
    elif (
        "config" in question_lower
        or "configuration" in question_lower
    ):
        answer = (
            f"The strongest configuration-related evidence "
            f"is in `{path}`."
        )
    elif (
        "test" in question_lower
        or "testing" in question_lower
    ):
        answer = (
            f"The strongest testing-related evidence is in "
            f"`{path}`."
        )
    else:
        answer = (
            f"The strongest evidence I found is in `{path}`. "
            f"The answer is based on matching repository "
            f"content rather than a hardcoded response."
        )

    if strongest["score"] >= 20:
        confidence = "high"
    elif strongest["score"] >= 10:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "answer": answer,
        "confidence": confidence,
        "keywords_used": keywords,
        "evidence": evidence,
    }


@app.post("/ask")
def ask(request: AskRequest):
    repository_data = load_repository(
        request.url
    )

    result = answer_repository_question(
        request.question,
        repository_data["file_contents"],
    )

    return result