"""
Automated PyInstaller Build Script for AI Assignment Desktop Client.
Compiles the application into a standalone Windows executable.
"""

import os
import shutil
import subprocess
import sys


def build():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    app_entry = os.path.join(root_dir, "assignment_app", "app", "main.py")
    dist_dir = os.path.join(root_dir, "assignment_app", "dist")
    build_dir = os.path.join(root_dir, "assignment_app", "build")
    backend_downloads = os.path.join(root_dir, "Backend", "static", "downloads")

    os.makedirs(dist_dir, exist_ok=True)
    os.makedirs(backend_downloads, exist_ok=True)

    pyinstaller_exe = "pyinstaller"
    py_scripts_pyinstaller = os.path.expandvars(
        r"%LocalAppData%\Python\pythoncore-3.14-64\Scripts\pyinstaller.exe"
    )
    if os.path.exists(py_scripts_pyinstaller):
        pyinstaller_exe = py_scripts_pyinstaller

    cmd = [
        pyinstaller_exe,
        "--onefile",
        "--noconsole",
        "--name",
        "AIAssignmentSetup",
        app_entry,
        "--distpath",
        dist_dir,
        "--workpath",
        build_dir,
        "--clean",
        "-y",
    ]

    print(f"[*] Building AI Assignment executable...")
    print(f"[*] Command: {' '.join(cmd)}")
    result = subprocess.run(cmd)

    if result.returncode != 0:
        print("[!] Build failed.")
        sys.exit(result.returncode)

    built_exe = os.path.join(dist_dir, "AIAssignmentSetup.exe")
    target_backend_exe = os.path.join(backend_downloads, "AIAssignmentSetup.exe")

    if os.path.exists(built_exe):
        shutil.copy2(built_exe, target_backend_exe)
        print(f"[SUCCESS] Built: {built_exe}")
        print(f"[SUCCESS] Copied to backend: {target_backend_exe}")

    # Clean temporary build folder
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir, ignore_errors=True)
    spec_file = os.path.join(root_dir, "AIAssignmentSetup.spec")
    if os.path.exists(spec_file):
        os.remove(spec_file)


if __name__ == "__main__":
    build()
