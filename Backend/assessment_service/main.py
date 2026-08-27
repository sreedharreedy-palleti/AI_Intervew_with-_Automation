import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.proctor import router as proctor_router
from app.exam import router as exam_router

app = FastAPI(title="Assignment & Proctoring Python Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proctor_router)
app.include_router(exam_router)

@app.get("/")
async def root():
    return {"status": "ok", "service": "Python Assessment Exam Service"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)