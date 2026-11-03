"""
AI Technical Assessment - Dedicated Desktop Client Launcher.
Delegates directly to assignment_app.app.main
Step 1: Login Gmail & Code
Step 2: Camera & Voice Access
Step 3: AI Assignment Workspace
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

try:
    from assignment_app.app.main import main
except ImportError:
    try:
        from app.main import main
    except ImportError:
        # Fallback to local launcher if standalone
        import subprocess
        import webbrowser

        def main():
            base_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
            token = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else ""
            target_url = f"{base_url}/assignment/{token}?from_app=true" if token else f"{base_url}/assignment/app?from_app=true"
            webbrowser.open(target_url)
            sys.exit(0)

if __name__ == "__main__":
    main()
