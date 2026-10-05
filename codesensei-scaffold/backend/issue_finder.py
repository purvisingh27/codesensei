import requests
import re


# =========================================================
# GITHUB ISSUE HELPERS
# =========================================================

PREFERRED_LABELS = {
    "good first issue": 100,
    "help wanted": 80,
    "documentation": 60,
    "docs": 60,
    "bug": 40,
    "enhancement": 30,
}


def issue_label_score(labels: list[dict]) -> int:
    """
    Give higher priority to beginner-friendly
    and useful GitHub issues.
    """

    score = 0

    for label in labels:

        name = label.get(
            "name",
            ""
        ).strip().lower()

        score += PREFERRED_LABELS.get(
            name,
            0
        )

    return score


def fetch_github_issues(
    owner: str,
    repo: str
) -> list[dict]:

    url = (
        f"https://api.github.com/repos/"
        f"{owner}/{repo}/issues"
    )

    response = requests.get(
        url,
        headers={
            "Accept": "application/vnd.github+json"
        },
        params={
            "state": "open",
            "per_page": 30
        },
        timeout=15
    )

    if response.status_code != 200:
        return []

    data = response.json()

    # GitHub's issues endpoint can also return
    # pull requests. We only want actual issues.
    issues = [
        issue
        for issue in data
        if "pull_request" not in issue
    ]

    return issues


def format_issue(issue: dict) -> dict:

    labels = [
        label.get("name", "")
        for label in issue.get(
            "labels",
            []
        )
    ]

    score = issue_label_score(
        issue.get(
            "labels",
            []
        )
    )

    return {
        "number": issue.get(
            "number"
        ),

        "title": issue.get(
            "title"
        ),

        "url": issue.get(
            "html_url"
        ),

        "state": issue.get(
            "state"
        ),

        "labels": labels,

        "comments": issue.get(
            "comments",
            0
        ),

        "created_at": issue.get(
            "created_at"
        ),

        "updated_at": issue.get(
            "updated_at"
        ),

        "priority_score": score,

        "source": "GitHub Issue"
    }


# =========================================================
# DERIVE TASK FROM REPOSITORY
# =========================================================

def derive_repository_task(
    analyzed_files: list[dict]
) -> dict:

    # -----------------------------------------------------
    # Search for TODO / FIXME
    # -----------------------------------------------------

    todo_matches = []

    for file_data in analyzed_files:

        content = file_data.get(
            "content"
        )

        if not content:
            continue

        path = file_data.get(
            "path",
            ""
        )

        lines = content.splitlines()

        for index, line in enumerate(lines):

            if re.search(
                r"\b(TODO|FIXME)\b",
                line,
                re.IGNORECASE
            ):

                todo_matches.append({
                    "file": path,
                    "line": index + 1,
                    "text": line.strip()[:300]
                })

    if todo_matches:

        match = todo_matches[0]

        return {
            "title": (
                "Address a TODO/FIXME in the codebase"
            ),

            "description": (
                f"Review the TODO/FIXME marker found "
                f"in `{match['file']}` and determine "
                f"whether the unfinished work should "
                f"be implemented."
            ),

            "source": "Repository evidence",

            "evidence": {
                "file": match["file"],
                "line": match["line"],
                "text": match["text"]
            }
        }

    # -----------------------------------------------------
    # Documentation fallback
    # -----------------------------------------------------

    has_readme = any(
        file_data.get(
            "path",
            ""
        ).lower().endswith(
            "readme.md"
        )
        for file_data in analyzed_files
    )

    if not has_readme:

        return {
            "title": "Add project documentation",

            "description": (
                "No README.md file was detected in the "
                "analyzed repository. Adding basic "
                "installation, usage, and project "
                "architecture documentation would "
                "improve onboarding."
            ),

            "source": "Repository evidence",

            "evidence": {
                "type": "Missing README.md"
            }
        }

    # -----------------------------------------------------
    # Test-file fallback
    # -----------------------------------------------------

    has_tests = any(
        (
            "/test/" in file_data.get(
                "path",
                ""
            ).lower()
            or
            "/tests/" in file_data.get(
                "path",
                ""
            ).lower()
            or
            file_data.get(
                "path",
                ""
            ).lower().startswith(
                "test_"
            )
        )
        for file_data in analyzed_files
    )

    if not has_tests:

        return {
            "title": "Add automated tests",

            "description": (
                "No conventional test files were detected "
                "in the analyzed repository. Adding tests "
                "around the main application behavior "
                "would improve reliability."
            ),

            "source": "Repository evidence",

            "evidence": {
                "type": "No conventional test files detected"
            }
        }

    # -----------------------------------------------------
    # Generic repository fallback
    # -----------------------------------------------------

    return {
        "title": "Review the repository structure",

        "description": (
            "No suitable open GitHub issue or obvious "
            "TODO/FIXME task was detected. Start by "
            "reviewing the main entry point and project "
            "documentation."
        ),

        "source": "Repository evidence",

        "evidence": {
            "type": "No specific task marker detected"
        }
    }


# =========================================================
# FIRST TASK FINDER
# =========================================================

def find_first_task(
    owner: str,
    repo: str,
    analyzed_files: list[dict]
) -> dict:

    # -----------------------------------------------------
    # Get real GitHub issues
    # -----------------------------------------------------

    issues = fetch_github_issues(
        owner,
        repo
    )

    formatted_issues = [
        format_issue(issue)
        for issue in issues
    ]

    # -----------------------------------------------------
    # Sort by beginner-friendly labels first
    # -----------------------------------------------------

    formatted_issues.sort(
        key=lambda issue: (
            issue["priority_score"],
            -issue["comments"]
        ),
        reverse=True
    )

    # -----------------------------------------------------
    # If useful issue exists
    # -----------------------------------------------------

    if formatted_issues:

        top_issue = formatted_issues[0]

        return {
            "found": True,

            "recommended_task": {
                "title": top_issue["title"],

                "description": (
                    "This is an open GitHub issue from "
                    "the analyzed repository."
                ),

                "source": "GitHub Issue",

                "issue_number": (
                    top_issue["number"]
                ),

                "url": top_issue["url"],

                "labels": top_issue["labels"],

                "priority_score": (
                    top_issue["priority_score"]
                )
            },

            "issues": formatted_issues[:10],

            "message": (
                "The recommended first task was "
                "selected from the repository's "
                "currently open GitHub issues."
            )
        }

    # -----------------------------------------------------
    # No GitHub issues → analyze repository
    # -----------------------------------------------------

    derived_task = derive_repository_task(
        analyzed_files
    )

    return {
        "found": True,

        "recommended_task": derived_task,

        "issues": [],

        "message": (
            "No open GitHub issues were available, "
            "so CodeSensei derived a potential first "
            "task from the repository contents."
        )
    }