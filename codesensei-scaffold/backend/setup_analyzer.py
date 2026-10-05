from pathlib import PurePosixPath


def get_filename(path: str) -> str:
    return PurePosixPath(path).name.lower()


def find_file(files: list[dict], filename: str):
    filename = filename.lower()

    for file in files:
        if get_filename(file.get("path", "")) == filename:
            return file

    return None


def find_files_by_name(
    files: list[dict],
    filenames: set[str]
):
    results = []

    for file in files:

        name = get_filename(
            file.get("path", "")
        )

        if name in filenames:
            results.append(file)

    return results


def detect_environment_files(
    files: list[dict]
) -> list[str]:

    environment_files = {
        ".env",
        ".env.example",
        ".env.sample",
        ".env.template",
        "config.env",
    }

    found = []

    for file in files:

        name = get_filename(
            file.get("path", "")
        )

        if name in environment_files:
            found.append(
                file.get("path", "")
            )

    return found


def detect_setup_files(
    files: list[dict]
) -> list[dict]:

    setup_names = {
        "readme.md",
        "requirements.txt",
        "pyproject.toml",
        "package.json",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "dockerfile",
        "docker-compose.yml",
        "compose.yml",
        "makefile",
        ".env.example",
        ".env.sample",
    }

    results = []

    for file in files:

        name = get_filename(
            file.get("path", "")
        )

        if name in setup_names:

            results.append({
                "path": file.get("path", ""),
                "type": name
            })

    return results


def detect_technologies(
    files: list[dict]
) -> list[str]:

    names = {
        get_filename(
            file.get("path", "")
        )
        for file in files
    }

    technologies = []

    if "package.json" in names:
        technologies.append(
            "Node.js / JavaScript ecosystem"
        )

    if "requirements.txt" in names:
        technologies.append(
            "Python"
        )

    if "pyproject.toml" in names:
        technologies.append(
            "Python"
        )

    if "pom.xml" in names:
        technologies.append(
            "Java / Maven"
        )

    if "build.gradle" in names:
        technologies.append(
            "Java / Gradle"
        )

    if "cargo.toml" in names:
        technologies.append(
            "Rust"
        )

    if "go.mod" in names:
        technologies.append(
            "Go"
        )

    if "dockerfile" in names:
        technologies.append(
            "Docker"
        )

    if "docker-compose.yml" in names:
        technologies.append(
            "Docker Compose"
        )

    if "compose.yml" in names:
        technologies.append(
            "Docker Compose"
        )

    if "index.html" in names:
        technologies.append(
            "HTML"
        )

    if any(
        name.endswith(".css")
        for name in names
    ):
        technologies.append(
            "CSS"
        )

    if any(
        name.endswith(".py")
        for name in names
    ):
        if "Python" not in technologies:
            technologies.append(
                "Python"
            )

    if any(
        name.endswith(".js")
        or name.endswith(".jsx")
        for name in names
    ):
        if (
            "Node.js / JavaScript ecosystem"
            not in technologies
        ):
            technologies.append(
                "JavaScript"
            )

    return technologies


def detect_entry_points(
    files: list[dict]
) -> list[str]:

    entry_names = {
        "main.py",
        "app.py",
        "server.py",
        "index.py",
        "index.js",
        "index.ts",
        "main.js",
        "main.ts",
        "index.html",
        "manage.py",
    }

    result = []

    for file in files:

        name = get_filename(
            file.get("path", "")
        )

        if name in entry_names:

            result.append(
                file.get("path", "")
            )

    return result[:10]


def build_setup_steps(
    files: list[dict],
    analyzed_files: list[dict]
) -> list[dict]:

    names = {
        get_filename(
            file.get("path", "")
        )
        for file in files
    }

    steps = []

    # -----------------------------------------------------
    # README
    # -----------------------------------------------------

    if "readme.md" in names:

        readme = find_file(
            files,
            "readme.md"
        )

        steps.append({
            "step": 1,
            "title": "Read the project documentation",
            "description": (
                "Review the repository README for "
                "project-specific installation and "
                "usage instructions."
            ),
            "source": readme.get("path")
            if readme else "README.md",
            "evidence": True
        })

    # -----------------------------------------------------
    # Python dependencies
    # -----------------------------------------------------

    if "requirements.txt" in names:

        requirements = find_file(
            files,
            "requirements.txt"
        )

        steps.append({
            "step": len(steps) + 1,
            "title": "Install Python dependencies",
            "description": (
                "Install the dependencies declared in "
                "requirements.txt."
            ),
            "command": (
                "pip install -r requirements.txt"
            ),
            "source": requirements.get("path")
            if requirements else "requirements.txt",
            "evidence": True
        })

    elif "pyproject.toml" in names:

        pyproject = find_file(
            files,
            "pyproject.toml"
        )

        steps.append({
            "step": len(steps) + 1,
            "title": "Install the Python project",
            "description": (
                "This repository contains a "
                "pyproject.toml file. Follow the "
                "project's Python packaging configuration "
                "to install its dependencies."
            ),
            "source": pyproject.get("path")
            if pyproject else "pyproject.toml",
            "evidence": True
        })

    # -----------------------------------------------------
    # Node dependencies
    # -----------------------------------------------------

    if "package.json" in names:

        package_file = find_file(
            files,
            "package.json"
        )

        steps.append({
            "step": len(steps) + 1,
            "title": "Install JavaScript dependencies",
            "description": (
                "Install the dependencies declared in "
                "package.json."
            ),
            "command": "npm install",
            "source": package_file.get("path")
            if package_file else "package.json",
            "evidence": True
        })

    # -----------------------------------------------------
    # Docker
    # -----------------------------------------------------

    if "dockerfile" in names:

        dockerfile = find_file(
            files,
            "dockerfile"
        )

        steps.append({
            "step": len(steps) + 1,
            "title": "Build the Docker image",
            "description": (
                "A Dockerfile is present, so the "
                "application can potentially be built "
                "as a Docker image."
            ),
            "command": (
                "docker build -t codesensei-app ."
            ),
            "source": dockerfile.get("path")
            if dockerfile else "Dockerfile",
            "evidence": True
        })

    # -----------------------------------------------------
    # Docker Compose
    # -----------------------------------------------------

    compose_file = (
        find_file(
            files,
            "docker-compose.yml"
        )
        or
        find_file(
            files,
            "compose.yml"
        )
    )

    if compose_file:

        steps.append({
            "step": len(steps) + 1,
            "title": "Start the Compose services",
            "description": (
                "A Docker Compose configuration is "
                "present in the repository."
            ),
            "command": (
                "docker compose up"
            ),
            "source": compose_file.get("path"),
            "evidence": True
        })

    # -----------------------------------------------------
    # Environment variables
    # -----------------------------------------------------

    environment_files = detect_environment_files(
        files
    )

    if environment_files:

        steps.append({
            "step": len(steps) + 1,
            "title": "Configure environment variables",
            "description": (
                "The repository contains an environment "
                "configuration file. Review it and provide "
                "the required values before running the "
                "application."
            ),
            "source": environment_files[0],
            "evidence": True
        })

    # -----------------------------------------------------
    # Entry point
    # -----------------------------------------------------

    entry_points = detect_entry_points(
        files
    )

    if entry_points:

        steps.append({
            "step": len(steps) + 1,
            "title": "Run the detected entry point",
            "description": (
                "The repository contains a conventional "
                "application entry point."
            ),
            "source": entry_points[0],
            "evidence": True
        })

    # -----------------------------------------------------
    # No setup information
    # -----------------------------------------------------

    if not steps:

        steps.append({
            "step": 1,
            "title": "Inspect the repository",
            "description": (
                "No conventional setup configuration "
                "files were detected. Review the "
                "repository structure manually before "
                "running the project."
            ),
            "source": None,
            "evidence": False
        })

    return steps


def analyze_setup(
    files: list[dict],
    analyzed_files: list[dict]
) -> dict:

    setup_files = detect_setup_files(
        files
    )

    technologies = detect_technologies(
        files
    )

    environment_files = detect_environment_files(
        files
    )

    entry_points = detect_entry_points(
        files
    )

    setup_steps = build_setup_steps(
        files,
        analyzed_files
    )

    return {
        "technologies": technologies,

        "setup_files": setup_files,

        "environment_files": environment_files,

        "entry_points": entry_points,

        "setup_steps": setup_steps,

        "evidence_based": True,

        "message": (
            "Setup information was generated from "
            "files detected in the repository. "
            "CodeSensei does not assume unsupported "
            "frameworks, services, or dependencies."
        )
    }