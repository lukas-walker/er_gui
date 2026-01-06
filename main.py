from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import HTMLResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import secrets
import requests
import os

# app
app = FastAPI()
security = HTTPBasic()

USERNAME = os.getenv("GUI_USERNAME", "admin")
PASSWORD = os.getenv("GUI_PASSWORD", "escape123")

BASE_URL = os.getenv("PI_BASE_URL", "http://83.228.207.123:8200")

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

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def index(request: Request, _auth=Depends(auth)):
    # No dynamic data yet, but request must be passed for url_for etc.
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/state")
def state(_auth=Depends(auth)):
    return requests.get(f"{BASE_URL}/state").json()

@app.post("/api/inc")
def inc(_auth=Depends(auth)):
    return requests.post(f"{BASE_URL}/inc").json()

@app.post("/api/dec")
def dec(_auth=Depends(auth)):
    return requests.post(f"{BASE_URL}/dec").json()

@app.post("/api/shutdown")
def shutdown(_auth=Depends(auth)):
    return requests.post(f"{BASE_URL}/shutdown").json()

@app.post("/api/reboot")
def reboot(_auth=Depends(auth)):
    return requests.post(f"{BASE_URL}/reboot").json()

@app.post("/api/reset")
def reset(_auth=Depends(auth)):
    return requests.post(f"{BASE_URL}/reset").json()

@app.get("/api/snapshot")
def api_snapshot(_auth=Depends(auth)):
    target_url = f"{BASE_URL}/client/video/frame"
    try:
        r = requests.get(target_url, timeout=5)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Error talking to Pi: {e}")

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Pi returned {r.status_code}")

    return Response(content=r.content, media_type="image/jpeg")
