from pathlib import PurePosixPath
import re


IMPORT_PATTERNS = [
    # Python
    re.compile(r"^\s*from\s+([A-Za-z0-9_./-]+)\s+import\s+", re.MULTILINE),
    re.compile(r"^\s*import\s+([A-Za-z0-9_./-]+)", re.MULTILINE),

    # JavaScript / TypeScript
    re.compile(
        r"""^\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']""",
        re.MULTILINE,
    ),
    re.compile(
        r"""^\s*(?:const|let|var)\s+.*?=\s*require\(["']([^"']+)["']\)""",
        re.MULTILINE,
    ),

    # Java
    re.compile(
        r"^\s*import\s+([A-Za-z0-9_.]+);",
        re.MULTILINE,
    ),

    # C / C++
    re.compile(
        r'^\s*#include\s+[<"]([^>"]+)[>"]',
        re.MULTILINE,
    ),
]


def normalize_path(path: str) -> str:
    return path.replace("\\", "/").lstrip("./")


def resolve_relative_import(source_path: str, import_path: str) -> list[str]:
    source = PurePosixPath(normalize_path(source_path))
    import_value = import_path.replace("\\", "/")

    if not import_value.startswith("."):
        return []

    base = source.parent
    target = PurePosixPath(base, import_value)

    return [
        str(target),
        str(target.with_suffix(".py")),
        str(target.with_suffix(".js")),
        str(target.with_suffix(".jsx")),
        str(target.with_suffix(".ts")),
        str(target.with_suffix(".tsx")),
        str(target.with_suffix(".java")),
        str(target.with_suffix(".c")),
        str(target.with_suffix(".cpp")),
        str(PurePosixPath(target, "index.js")),
        str(PurePosixPath(target, "index.ts")),
        str(PurePosixPath(target, "index.tsx")),
    ]


def resolve_python_import(
    source_path: str,
    import_value: str,
    known_paths: set[str],
) -> str | None:
    cleaned = import_value.strip().replace(".", "/")

    candidates = [
        cleaned,
        f"{cleaned}.py",
        f"{cleaned}/__init__.py",
    ]

    source_parent = PurePosixPath(source_path).parent

    relative_candidate = str(
        PurePosixPath(source_parent, cleaned)
    )

    candidates.extend(
        [
            relative_candidate,
            f"{relative_candidate}.py",
            f"{relative_candidate}/__init__.py",
        ]
    )

    for candidate in candidates:
        candidate = normalize_path(candidate)

        if candidate in known_paths:
            return candidate

    return None


def resolve_import(
    source_path: str,
    import_value: str,
    known_paths: set[str],
) -> str | None:
    import_value = import_value.strip()

    if import_value.startswith("."):
        candidates = resolve_relative_import(
            source_path,
            import_value,
        )

        for candidate in candidates:
            candidate = normalize_path(candidate)

            if candidate in known_paths:
                return candidate

        return None

    python_match = resolve_python_import(
        source_path,
        import_value,
        known_paths,
    )

    if python_match:
        return python_match

    normalized_import = normalize_path(import_value)

    for path in known_paths:
        if path.endswith(normalized_import):
            return path

    return None


def extract_imports(content: str) -> list[str]:
    imports = []

    for pattern in IMPORT_PATTERNS:
        for match in pattern.finditer(content):
            if match.groups():
                imports.append(match.group(1))

    return list(dict.fromkeys(imports))


def analyze_relationships(
    files: list[dict],
    file_contents: dict[str, str],
) -> list[dict]:
    known_paths = {
        normalize_path(file.get("path", ""))
        for file in files
        if file.get("path")
    }

    relationships = []

    for source_path, content in file_contents.items():
        source_path = normalize_path(source_path)

        imports = extract_imports(content)

        for import_value in imports:
            target_path = resolve_import(
                source_path,
                import_value,
                known_paths,
            )

            if not target_path:
                continue

            if target_path == source_path:
                continue

            relationships.append(
                {
                    "source": source_path,
                    "target": target_path,
                    "type": "imports",
                    "label": "imports",
                }
            )

    unique = {}

    for relationship in relationships:
        key = (
            relationship["source"],
            relationship["target"],
            relationship["type"],
        )

        unique[key] = relationship

    return list(unique.values())