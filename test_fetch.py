import requests
import json
try:
    r = requests.post("http://localhost:5003/api/analyze", json={"ticker": "RELIANCE.NS"}, timeout=60)
    print("STATUS:", r.status_code)
    with open("result.json", "w") as f:
        json.dump(r.json(), f, indent=2)
    print("WROTE result.json")
except Exception as e:
    print("ERROR:", e)
