from fastapi import FastAPI, HTTPException
import requests

app = FastAPI()

GOODLOADING_URL = "https://api.goodloading.com/api/external/calculation"
ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg2ZTc5NGQyLWMxNmMtNDY3ZS04YzQyLWU0YTI4NDg5NzMwZCIsImlhdCI6MTc3NDI1NTU5MX0.15_nXCsgBl_XEftfl5v2v2ebHzssyeH6bLbyMdqd7os"  # 🔐 replace this

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}
@app.post("/calculate")
def calculate_loading(data: dict):
    try:
        response = requests.post(
            GOODLOADING_URL,
            json=data,
            headers=headers
        )

        if response.status_code == 200:
            return response.json()

        elif response.status_code == 400:
            raise HTTPException(status_code=400, detail="Validation Error")

        elif response.status_code == 401:
            raise HTTPException(status_code=401, detail="Unauthorized")

        elif response.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

        else:
            raise HTTPException(status_code=500, detail=response.text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
RECOMMEND_URL = "https://api.goodloading.com/api/external/calculation/recommendation"

@app.post("/recommend")
def recommend_loading(data: dict):
    try:
        response = requests.post(
            RECOMMEND_URL,
            json=data,
            headers=headers
        )

        return response.json()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))