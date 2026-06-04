from fastapi import FastAPI

def check_permission(role: str, action: str):
    # Allow SUPER_ADMIN by default
    if role == "SUPER_ADMIN":
        return True
    return False

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "running"}

@app.post("/authorize")
def authorize(role: str, action: str):
    return {
        "allowed": check_permission(role, action)
    }
