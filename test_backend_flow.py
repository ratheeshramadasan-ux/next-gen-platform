import requests
import time
from datetime import date

AUTH_URL = "http://localhost:8002"
API_URL = "http://localhost:8000"
CONTROL_URL = "http://localhost:8001"

def test_flow():
    print("--- Starting Backend Flow Verification ---")
    
    # 1. Register a new user
    user_data = {
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "date_of_birth": "1990-01-01",
        "password": "Password123!"
    }
    print(f"1. Registering: {user_data['email']}")
    try:
        res = requests.post(f"{AUTH_URL}/auth/register", json=user_data)
        print("   Response:", res.json())
    except Exception as e:
        print("   Error:", e)

    # 2. Login (Should fail: NOT_ACTIVE)
    print("2. Attempting login (expected failure: PENDING_ACTIVATION)")
    try:
        res = requests.post(f"{AUTH_URL}/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        print("   Response:", res.status_code, res.json())
    except Exception as e:
        print("   Error:", e)

    # 3. Simulate Job Submission
    print("3. Submitting Job to API Gateway")
    try:
        job_payload = {"action": "scrape", "url": "https://google.com"}
        res = requests.post(f"{API_URL}/submit", json=job_payload)
        job_info = res.json()
        print("   Job Created ID:", job_info.get("job_id"))
        
        # Check if worker picks it up
        print("   Waiting for worker to process...")
        time.sleep(5)
        
        # Verify status in control plane
        res = requests.post(f"{CONTROL_URL}/job/complete/{job_info.get('job_id')}")
        print("   Job Status Check (re-complete check):", res.status_code)
    except Exception as e:
        print("   Error:", e)

    print("--- Verification Complete ---")

if __name__ == "__main__":
    # Note: This assumes services are running.
    # In a local dev env, the user should run docker-compose up first.
    test_flow()
