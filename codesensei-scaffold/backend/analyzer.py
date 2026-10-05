from collections import Counter
from pathlib import PurePosixPath
import re


IGNORED_NAMES = {
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    "__pycache__",
}


LANGUAGE_MAP = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript React",
    ".ts": "TypeScript",
    ".tsx": "TypeScript React",
    ".java": "Java",
    ".c": "C",
    ".cpp": "C++",
    ".h": "C/C++ Header",
    ".hpp": "C++ Header",
    ".go": "Go",
    ".rs": "Rust",
    ".php": "PHP",
    ".rb": "Ruby",
    ".cs": "C#",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sql": "SQL",
}


def is_ignored(path: str) -> bool:
    parts = PurePosixPath(path).parts
    return any(part in IGNORED_NAMES for part in parts)


def detect_languages(files: list[dict]) -> dict:
    counts = Counter()

    for file in files:
        path = file.get("path", "")
        if is_ignored(path):
            continue

        suffix = PurePosixPath(path).suffix.lower()

        if suffix in LANGUAGE_MAP:
            counts[LANGUAGE_MAP[suffix]] += 1

    return dict(counts.most_common())


def find_important_files(files: list[dict]) -> list[dict]:
    important_names = {
        "readme.md": 10,
        "package.json": 10,
        "requirements.txt": 10,
        "pyproject.toml": 10,
        "dockerfile": 9,
        "docker-compose.yml": 9,
        "compose.yml": 9,
        "main.py": 8,
        "app.py": 8,
        "index.js": 8,
        "index.ts": 8,
        "index.html": 6,
        "makefile": 7,
    }

    candidates = []

    for file in files:
        path = file.get("path", "")
        name = PurePosixPath(path).name.lower()

        if is_ignored(path):
            continue

        score = important_names.get(name, 0)

        if score:
            candidates.append({
                "path": path,
                "reason": "Important project/configuration file",
                "score": score,
            })

    candidates.sort(key=lambda item: item["score"], reverse=True)

    return candidates[:10]


def detect_entry_points(files: list[dict]) -> list[str]:
    entry_names = {
        "main.py",
        "app.py",
        "server.py",
        "index.js",
        "index.ts",
        "main.js",
        "main.ts",
        "index.html",
        "manage.py",
    }

    result = []

    for file in files:
        path = file.get("path", "")
        name = PurePosixPath(path).name.lower()

        if name in entry_names and not is_ignored(path):
            result.append(path)

    return result[:10]


def detect_project_type(files: list[dict]) -> str:
    names = {
        PurePosixPath(file.get("path", "")).name.lower()
        for file in files
        if not is_ignored(file.get("path", ""))
    }

    if "package.json" in names:
        return "JavaScript/Node.js project"

    if "requirements.txt" in names or "pyproject.toml" in names:
        return "Python project"

    if "pom.xml" in names:
        return "Java/Maven project"

    if "build.gradle" in names:
        return "Java/Gradle project"

    if "cargo.toml" in names:
        return "Rust project"

    if "go.mod" in names:
        return "Go project"

    if "dockerfile" in names:
        return "Containerized application"

    if "index.html" in names:
        return "Web application"

    return "Unknown project type"


def build_architecture_summary(
    files: list[dict],
    languages: dict,
    important_files: list[dict],
    entry_points: list[str],
) -> str:

    file_count = len(files)

    if languages:
        language_text = ", ".join(
            f"{language} ({count} files)"
            for language, count in list(languages.items())[:5]
        )
    else:
        language_text = "No recognized programming languages"

    if entry_points:
        entry_text = ", ".join(entry_points[:3])
    else:
        entry_text = "No conventional entry point detected"

    return (
        f"This repository contains approximately {file_count} analyzed files. "
        f"The main detected technologies are {language_text}. "
        f"Potential entry points include {entry_text}. "
        f"The analysis is based on the repository file tree and recognized "
        f"project/configuration files."
    )


def analyze_repository(files: list[dict]) -> dict:
    clean_files = [
        file for file in files
        if not is_ignored(file.get("path", ""))
    ]

    languages = detect_languages(clean_files)
    important_files = find_important_files(clean_files)
    entry_points = detect_entry_points(clean_files)
    project_type = detect_project_type(clean_files)

    summary = build_architecture_summary(
        clean_files,
        languages,
        important_files,
        entry_points,
    )

    return {
        "file_count": len(clean_files),
        "project_type": project_type,
        "languages": languages,
        "entry_points": entry_points,
        "important_files": important_files,
        "summary": summary,
    }