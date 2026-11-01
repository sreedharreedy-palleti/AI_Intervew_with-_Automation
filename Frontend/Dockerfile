# ==========================================
# AI Interview Platform - Frontend Dockerfile
# Multi-Stage Build: Node 20 + Nginx Alpine
# ==========================================

# ------------------------------------------
# Stage 1: Build React/Vite Application
# ------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install npm dependencies (including devDependencies needed for vite build)
RUN npm ci

# Copy full frontend source code
COPY . .

# Build argument for backend API URL (default to localhost:8000)
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build production distribution bundle
RUN npm run build

# ------------------------------------------
# Stage 2: Production Nginx Static Server
# ------------------------------------------
FROM nginx:alpine

# Remove default nginx static site
RUN rm -rf /usr/share/nginx/html/*

# Copy built production assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (handles SPA client-side routing & compression)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check to ensure Nginx is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

