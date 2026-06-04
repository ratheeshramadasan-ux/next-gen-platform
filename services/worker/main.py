import time
import requests

CONTROL = "http://control-plane:8001"

while True:
    try:
        res = requests.get(f"{CONTROL}/job/next").json()
        job = res.get("job")

        if job:
            print("Processing job:", job["id"])
            time.sleep(2)

            requests.post(f"{CONTROL}/job/complete/{job['id']}")

        time.sleep(1)

    except Exception as e:
        print("worker error:", e)
        time.sleep(2)
