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

@app.get("/api/video")
def api_video(auth=Depends(auth)):
    """
    Proxy MJPEG from server Pi to browser using requests.
    """
    target_url = f"{BASE_URL}/client/video/mjpeg"

    def stream():
        with requests.get(target_url, stream=True) as r:
            for chunk in r.iter_content(chunk_size=1024):
                if chunk:
                    yield chunk

    return StreamingResponse(
        stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )