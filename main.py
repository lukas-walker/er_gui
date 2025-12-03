from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
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

from fastapi.staticfiles import StaticFiles

app.mount("/static", StaticFiles(directory="static"), name="static")

# Raspberry Pi reverse tunnel base
BASE_URL = os.getenv("PI_BASE_URL", "http://83.228.207.123:8200")

@app.get("/", response_class=HTMLResponse)
def index(auth=Depends(auth)):
    return FileResponse("index.html")

@app.get("/api/state")
def state(auth=Depends(auth)):
    return requests.get(f"{BASE_URL}/state").json()

@app.post("/api/inc")
def inc(auth=Depends(auth)):
    return requests.post(f"{BASE_URL}/inc").json()

@app.post("/api/dec")
def dec(auth=Depends(auth)):
    return requests.post(f"{BASE_URL}/dec").json()

@app.post("/api/shutdown")
def shutdown(auth=Depends(auth)):
    return requests.post(f"{BASE_URL}/shutdown").json()


@app.post("/api/reboot")
def reboot(auth=Depends(auth)):
    return requests.post(f"{BASE_URL}/reboot").json()


@app.post("/api/reset")
def reset(auth=Depends(auth)):
    return requests.post(f"{BASE_URL}/reset").json()

@app.get("/api/snapshot")
def api_snapshot(auth=Depends(auth)):
    """
    Proxy a single JPEG frame from the server Pi to the browser.
    """
    target_url = f"{BASE_URL}/client/video/frame"

    try:
        r = requests.get(target_url, timeout=5)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Error talking to Pi: {e}")

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Pi returned {r.status_code}")

    return Response(content=r.content, media_type="image/jpeg")