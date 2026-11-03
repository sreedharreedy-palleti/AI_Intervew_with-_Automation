"""Backward-compatible proxy module pointing Assignment -> assignment_app."""
import sys
import assignment_app

sys.modules["Assignment"] = assignment_app
from assignment_app.routes import assignment_router

__all__ = ["assignment_router"]
