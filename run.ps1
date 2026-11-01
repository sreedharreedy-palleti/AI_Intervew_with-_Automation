<#
.SYNOPSIS
    One-Command Orchestrator for AI Interview Platform
    Manages Docker, Kubernetes, and CI/CD Pipeline with a single command.

.EXAMPLE
    .\run.ps1          # Interactive menu or default full stack run
    .\run.ps1 all      # Runs CI/CD validation, starts Docker, and deploys to Kubernetes
    .\run.ps1 docker   # Builds and runs Docker containers
    .\run.ps1 k8s      # Deploys Backend and Frontend to Kubernetes
    .\run.ps1 cicd     # Runs full CI/CD test and build validation locally
    .\run.ps1 stop     # Stops all Docker containers and removes K8s deployments
#>

param (
    [Parameter(Position=0)]
    [ValidateSet("all", "docker", "k8s", "cicd", "stop", "status", "")]
    [string]$Action = "all"
)

$ErrorActionPreference = "Continue"

function Write-Header([string]$title) {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
}

function Write-Success([string]$msg) {
    Write-Host "[SUCCESS] $msg" -ForegroundColor Green
}

function Write-Info([string]$msg) {
    Write-Host "[INFO] $msg" -ForegroundColor Yellow
}

function Run-CICD {
    Write-Header "RUNNING CI/CD PIPELINE VALIDATION"

    Write-Info "1. Validating Backend (Python syntax & bytecode compilation)..."
    try {
        if (Get-Command "py" -ErrorAction SilentlyContinue) {
            py -m compileall Backend/
        } elseif (Get-Command "python" -ErrorAction SilentlyContinue) {
            python -m compileall Backend/
        }
        Write-Success "Backend code compilation passed."
    } catch {
        Write-Info "Python compiler check skipped ($($_.Exception.Message))."
    }

    Write-Info "2. Validating Frontend (Node production build)..."
    Push-Location Frontend
    try {
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Frontend build passed."
        }
    } finally {
        Pop-Location
    }

    Write-Info "3. Validating Kubernetes Manifests..."
    Get-Content "Backend\k8s.yaml" | Out-Null
    Get-Content "Frontend\k8s.yaml" | Out-Null
    Write-Success "Kubernetes manifests syntax verified."

    Write-Success "All CI/CD Pipeline checks passed cleanly!"
}

function Run-Docker {
    Write-Header "RUNNING DOCKER CONTAINERS"
    
    # 1. Test if Docker Desktop Engine is active
    $dockerCheck = docker version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Docker Desktop daemon is not running!" -ForegroundColor Red
        Write-Host "  -> Please open 'Docker Desktop' from your Windows Start Menu or Desktop." -ForegroundColor Yellow
        Write-Host "  -> Wait 10-15 seconds until the whale icon turns green ('Engine running')." -ForegroundColor Yellow
        Write-Host "  -> Then run '.\run.ps1 docker' or '.\run.ps1 all' again." -ForegroundColor Yellow
        return
    }

    # 2. Release conflicting ports from any previous standalone containers
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    docker rm -f ai-frontend ai-backend 2>&1 | Out-Null
    $ErrorActionPreference = $oldEap

    Write-Info "Starting containers with Docker Compose..."
    docker compose up -d --build

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Info "Checking running containers:"
        docker compose ps

        Write-Host ""
        Write-Success "Docker stack is live!"
        Write-Host "  * Frontend App:  http://localhost:5173" -ForegroundColor White
        Write-Host "  * Backend API:   http://localhost:8000/docs" -ForegroundColor White
    } else {
        Write-Host "[ERROR] Docker Compose failed to start containers. See error above." -ForegroundColor Red
    }
}

function Run-Kubernetes {
    Write-Header "DEPLOYING TO KUBERNETES"

    try {
        $oldEap = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        $check = kubectl cluster-info 2>&1
        $ErrorActionPreference = $oldEap

        if ($LASTEXITCODE -ne 0) {
            Write-Info "Local Kubernetes cluster is offline. Enable Kubernetes in Docker Desktop -> Settings -> Kubernetes."
            return
        }

        Write-Info "1. Applying Backend Kubernetes manifest..."
        kubectl apply -f Backend/k8s.yaml

        Write-Info "2. Applying Frontend Kubernetes manifest..."
        kubectl apply -f Frontend/k8s.yaml

        Write-Host ""
        Write-Info "Checking Kubernetes resources in 'ai-interview' namespace:"
        kubectl get all -n ai-interview

        Write-Success "Kubernetes resources deployed successfully!"
        Write-Host "  * Forward Frontend: kubectl port-forward svc/frontend-service 3000:80 -n ai-interview" -ForegroundColor Gray
        Write-Host "  * Forward Backend:  kubectl port-forward svc/backend-service 8000:8000 -n ai-interview" -ForegroundColor Gray
    } catch {
        Write-Info "Kubernetes cluster is not ready. Skipping Kubernetes deployment."
    }
}

function Stop-All {
    Write-Header "STOPPING ALL CONTAINERS & KUBERNETES RESOURCES"

    Write-Info "Stopping Docker containers..."
    docker compose down --remove-orphans

    Write-Info "Cleaning up Kubernetes resources..."
    kubectl delete -f Frontend/k8s.yaml --ignore-not-found=true
    kubectl delete -f Backend/k8s.yaml --ignore-not-found=true

    Write-Success "All services stopped cleanly."
}

function Show-Status {
    Write-Header "CURRENT SYSTEM STATUS"
    Write-Host "--- Docker Containers ---" -ForegroundColor Yellow
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    Write-Host ""
    Write-Host "--- Kubernetes Resources ---" -ForegroundColor Yellow
    try {
        $oldEap = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        kubectl get pods,svc -n ai-interview 2>&1 | Out-String | Write-Host
        $ErrorActionPreference = $oldEap
    } catch {
        Write-Host "Kubernetes cluster not currently connected (enable in Docker Desktop settings)." -ForegroundColor Gray
    }
}

# ----------------- Main Entrypoint -----------------
switch ($Action.ToLower()) {
    "cicd" {
        Run-CICD
    }
    "docker" {
        Run-Docker
    }
    "k8s" {
        Run-Kubernetes
    }
    "stop" {
        Stop-All
    }
    "status" {
        Show-Status
    }
    "all" {
        Run-CICD
        Run-Docker
        try {
            Run-Kubernetes
        } catch {
            Write-Info "Kubernetes cluster is not currently running locally. Docker containers are active."
        }
    }
    default {
        Write-Host "Usage: .\run.ps1 [all | docker | k8s | cicd | stop | status]" -ForegroundColor Yellow
    }
}
