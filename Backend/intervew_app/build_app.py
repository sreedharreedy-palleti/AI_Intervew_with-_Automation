"""
Automated PyInstaller Build Script for AI Technical Interview Desktop Client.
Compiles the application into a standalone Windows executable.
"""

import os
import shutil
import subprocess
import sys


def build():
    this_dir = os.path.abspath(os.path.dirname(__file__))
    app_entry = os.path.join(this_dir, "app", "main.py")
    dist_dir = os.path.join(this_dir, "dist")
    build_dir = os.path.join(this_dir, "build")

    # Resolve static downloads inside Backend
    backend_downloads = os.path.abspath(os.path.join(this_dir, "..", "static", "downloads"))
    if not os.path.exists(os.path.dirname(backend_downloads)):
        backend_downloads = os.path.abspath(os.path.join(this_dir, "Backend", "static", "downloads"))

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
        "AIInterviewSetup",
        app_entry,
        "--distpath",
        dist_dir,
        "--workpath",
        build_dir,
        "--clean",
        "-y",
    ]

    print(f"[*] Building AI Technical Interview executable...")
    print(f"[*] Command: {' '.join(cmd)}")
    result = subprocess.run(cmd)

    if result.returncode != 0:
        print("[!] Build failed.")
        sys.exit(result.returncode)

    built_exe = os.path.join(dist_dir, "AIInterviewSetup.exe")
    target_backend_exe = os.path.join(backend_downloads, "AIInterviewSetup.exe")

    if os.path.exists(built_exe):
        shutil.copy2(built_exe, target_backend_exe)
        print(f"[SUCCESS] Built: {built_exe}")
        print(f"[SUCCESS] Copied to backend: {target_backend_exe}")

    # Clean temporary build folder
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir, ignore_errors=True)


if __name__ == "__main__":
    build()

