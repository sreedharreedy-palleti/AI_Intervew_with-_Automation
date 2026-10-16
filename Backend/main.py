from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import connect_to_mongo, close_mongo_connection
from auth.routes import auth_router
from Admin.routes import admin_router
from Users.routes import users_router
from Assignment.routes import assignment_router

# Ensure uploads directory exists on launch
UPLOAD_DIR = Path("uploads/resumes")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(title="AI Interview Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded resumes statically (e.g., http://localhost:8000/uploads/resumes/...)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Mount routes
app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(admin_router, prefix="/api/v1/admin")
app.include_router(users_router, prefix="/api/v1/user")
app.include_router(assignment_router, prefix="/api/v1/assignment")


@app.get("/", tags=["Health"])
def root():
    return {"status": "online", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)