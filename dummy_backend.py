from fastapi import FastAPI
import uvicorn

app = FastAPI()

state = {"round": 0}

@app.get("/state")
def get_state():
    return state

@app.post("/inc")
def inc():
    state["round"] += 1
    return state

@app.post("/dec")
def dec():
    state["round"] -= 1
    return state

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9999)