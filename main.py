from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import HTMLResponse, FileResponse
import secrets
import requests
import os

app = FastAPI()
security = HTTPBasic()

# ---------------------------
# AUTH CREDENTIALS
# (override via env vars in Coolify)
# ---------------------------
USERNAME = os.getenv("GUI_USERNAME", "admin")
PASSWORD = os.getenv("GUI_PASSWORD", "escape123")

# ---------------------------
# PROTECTED ROUTE MODEL
# ---------------------------
def auth(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, USERNAME)
    correct_password = secrets.compare_digest(credentials.password, PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return True

# Raspberry Pi reverse tunnel base
BASE_URL = os.getenv("PI_BASE_URL", "http://<VPS-IP>:8200")

@app.get("/", response_class=HTMLResponse)
def dashboard(auth=Depends(auth)):
    return FileResponse("dashboard.html")

@app.get("/api/state")
def state(auth=Depends(auth)):
    return requests.get(f"{BASE_URL}/state").json()

@app.post("/api/inc")
def inc(auth=Depends(auth)):
    return requests.post(f"{BASE_URL}/inc").json()

@app.post("/api/dec")
def dec(auth=Depends(auth)):
    return requests.post(f"{BASE_URL}/dec").json()