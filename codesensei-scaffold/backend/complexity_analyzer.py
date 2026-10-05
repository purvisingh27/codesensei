from pathlib import PurePosixPath
import re


# ---------------------------------------------------------
# FILE TYPES
# ---------------------------------------------------------

SUPPORTED_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".java",
    ".c",
    ".cpp",
    ".go",
    ".rs",
    ".php",
    ".rb",
    ".cs",
}


IGNORED_PARTS = {
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


# ---------------------------------------------------------
# PATTERNS
# ---------------------------------------------------------

FUNCTION_PATTERNS = [
    re.compile(
        r"^\s*(?:async\s+)?def\s+\w+\s*\(",
        re.MULTILINE,
    ),
    re.compile(
        r"^\s*(?:async\s+)?function\s+\w+\s*\(",
        re.MULTILINE,
    ),
    re.compile(
        r"^\s*(?:public|private|protected|static|\s)*"
        r"\w[\w<>\[\], ]*\s+\w+\s*\([^;{}]*\)"
        r"\s*\{",
        re.MULTILINE,
    ),
]


CLASS_PATTERN = re.compile(
    r"^\s*(?:class|interface|struct)\s+\w+",
    re.MULTILINE,
)


IMPORT_PATTERNS = [
    re.compile(
        r"^\s*(?:from|import)\s+",
        re.MULTILINE,
    ),
    re.compile(
        r"^\s*(?:const|let|var)\s+.*?"
        r"=\s*(?:require|import)\s*\(",
        re.MULTILINE,
    ),
    re.compile(
        r"^\s*#include\s+[<\"]",
        re.MULTILINE,
    ),
]


BRANCH_PATTERN = re.compile(
    r"\b("
    r"if|elif|else|for|while|except|case|catch|"
    r"switch|&&|\|\||\?"
    r")\b"
)


COMMENT_PATTERN = re.compile(
    r"^\s*(#|//|/\*|\*|<!--)"
)


# ---------------------------------------------------------
# HELPERS
# ---------------------------------------------------------

def is_ignored(path: str) -> bool:
    parts = PurePosixPath(path).parts

    return any(
        part in IGNORED_PARTS
        for part in parts
    )


def is_supported_source_file(path: str) -> bool:
    if is_ignored(path):
        return False

    suffix = PurePosixPath(path).suffix.lower()

    return suffix in SUPPORTED_EXTENSIONS


def calculate_complexity_score(
    lines_of_code: int,
    functions: int,
    classes: int,
    imports: int,
    branches: int,
) -> int:
    """
    Explainable heuristic score.

    The score is intentionally simple so that CodeSensei
    can explain why a file was classified as a hotspot.
    """

    score = 0

    # Size contribution
    score += min(
        lines_of_code // 20,
        30,
    )

    # Functions
    score += min(
        functions * 2,
        20,
    )

    # Classes
    score += min(
        classes * 3,
        15,
    )

    # Imports / dependencies
    score += min(
        imports,
        10,
    )

    # Branching
    score += min(
        branches * 2,
        30,
    )

    return score


def classify_hotspot(score: int) -> str:
    if score >= 45:
        return "High"

    if score >= 20:
        return "Medium"

    return "Low"


def build_reason(
    lines_of_code: int,
    functions: int,
    classes: int,
    imports: int,
    branches: int,
    hotspot: str,
) -> str:
    reasons = []

    if lines_of_code >= 300:
        reasons.append(
            "large file"
        )
    elif lines_of_code >= 150:
        reasons.append(
            "moderately large file"
        )

    if functions >= 15:
        reasons.append(
            "many functions"
        )
    elif functions >= 8:
        reasons.append(
            "several functions"
        )

    if classes >= 5:
        reasons.append(
            "multiple classes"
        )

    if imports >= 10:
        reasons.append(
            "many dependencies"
        )

    if branches >= 15:
        reasons.append(
            "many control-flow branches"
        )

    if not reasons:
        reasons.append(
            "limited structural complexity"
        )

    reason_text = ", ".join(reasons)

    return (
        f"{hotspot} hotspot because of "
        f"{reason_text}."
    )


# ---------------------------------------------------------
# SINGLE FILE ANALYSIS
# ---------------------------------------------------------

def analyze_file_complexity(
    path: str,
    content: str,
) -> dict:
    lines = content.splitlines()

    non_empty_lines = [
        line
        for line in lines
        if line.strip()
    ]

    code_lines = [
        line
        for line in non_empty_lines
        if not COMMENT_PATTERN.match(line)
    ]

    lines_of_code = len(code_lines)

    functions = 0

    for pattern in FUNCTION_PATTERNS:
        functions += len(
            pattern.findall(content)
        )

    classes = len(
        CLASS_PATTERN.findall(content)
    )

    imports = 0

    for pattern in IMPORT_PATTERNS:
        imports += len(
            pattern.findall(content)
        )

    branches = len(
        BRANCH_PATTERN.findall(content)
    )

    complexity_score = calculate_complexity_score(
        lines_of_code=lines_of_code,
        functions=functions,
        classes=classes,
        imports=imports,
        branches=branches,
    )

    hotspot = classify_hotspot(
        complexity_score
    )

    reason = build_reason(
        lines_of_code=lines_of_code,
        functions=functions,
        classes=classes,
        imports=imports,
        branches=branches,
        hotspot=hotspot,
    )

    return {
        "path": path,
        "lines_of_code": lines_of_code,
        "functions": functions,
        "classes": classes,
        "imports": imports,
        "branches": branches,
        "complexity_score": complexity_score,
        "hotspot": hotspot,
        "reason": reason,
    }


# ---------------------------------------------------------
# REPOSITORY ANALYSIS
# ---------------------------------------------------------

def analyze_complexity(
    files: list[dict],
    file_contents: dict[str, str],
) -> dict:
    results = []

    for path, content in file_contents.items():
        if not is_supported_source_file(path):
            continue

        result = analyze_file_complexity(
            path,
            content,
        )

        results.append(result)

    results.sort(
        key=lambda item: item["complexity_score"],
        reverse=True,
    )

    high_count = sum(
        1
        for item in results
        if item["hotspot"] == "High"
    )

    medium_count = sum(
        1
        for item in results
        if item["hotspot"] == "Medium"
    )

    low_count = sum(
        1
        for item in results
        if item["hotspot"] == "Low"
    )

    return {
        "files_analyzed": len(results),
        "high_hotspots": high_count,
        "medium_hotspots": medium_count,
        "low_hotspots": low_count,
        "hotspots": results[:20],
    }