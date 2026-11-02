import os
import sys
from pathlib import Path

# Resolve path to Backend directory
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "Backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Switch working directory to Backend so relative file paths, models, and .env resolve
os.chdir(str(backend_dir))

if __name__ == "__main__":
    import uvicorn
    print("[AI Interview Platform] Starting Backend on http://localhost:8000 ...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
