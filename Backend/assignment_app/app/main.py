"""
AI Technical Assessment - Desktop Client Entry Point.
Launches the single unified application window:
Step 1: Login Gmail & Code
Step 2: Camera & Voice Access
Step 3: AI Assignment Workspace
"""

import sys
from typing import List

from .config import FRONTEND_URL, USER_DATA_DIR
from .browser_launcher import find_browser, launch_assessment_window
from .shortcut_creator import create_desktop_shortcut


def resolve_target_url(args: List[str]) -> str:
    """Resolves target exam URL from CLI arguments or defaults to the app entry."""
    token = ""
    if len(args) > 1:
        for i, arg in enumerate(args):
            if arg in ("--token", "-t") and i + 1 < len(args):
                token = args[i + 1]
            elif not arg.startswith("-") and len(arg) > 6:
                token = arg

    if token and token not in ("app", "portal", "direct"):
        return f"{FRONTEND_URL}/assignment/{token}?from_app=true"
    return f"{FRONTEND_URL}/assignment/app?from_app=true"


def main():
    target_url = resolve_target_url(sys.argv)
    browser = find_browser()

    if browser:
        shortcut_args = f'--app={target_url} --user-data-dir="{USER_DATA_DIR}" --start-maximized'
        create_desktop_shortcut(browser, shortcut_args)

    # Launch dedicated single app window
    launch_assessment_window(target_url)

    # Terminate launcher process immediately: ensures no second window or taskbar icon remains
    sys.exit(0)


if __name__ == "__main__":
    main()

