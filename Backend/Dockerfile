# ==========================================
# AI Interview Platform - Backend Dockerfile
# Python 3.11 Slim with YOLO & OpenCV Support
# ==========================================

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    MONGO_URI="mongodb+srv://rnani7046_db_user:yP12QMpKzf1iOzEe@cluster0.g38ahsr.mongodb.net" \
    DATABASE_NAME="interview_db"

# Install system dependencies required by OpenCV, YOLO11, and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency definition first for optimal Docker layer caching
COPY requirements.txt .

# 1. Upgrade pip
# 2. Install lightweight CPU PyTorch & Torchvision (avoids downloading 3GB of unused CUDA binaries)
# 3. Install remaining application dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu torch torchvision && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY . /app

# Expose FastAPI application port
EXPOSE 8000

# Health check to ensure FastAPI is up and answering
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Start Uvicorn ASGI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
