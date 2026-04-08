from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests

from payload_mapper import build_goodloading_payload

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOODLOADING_URL = "https://api.goodloading.com/api/external/calculation"
GOODLOADING_RECOMMEND_URL = (
    "https://api.goodloading.com/api/external/calculation/recommendation"
)
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
    
RECOMMEND_URL = GOODLOADING_RECOMMEND_URL

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
    
@app.post("/map")
def map_loading(data: dict):
    try:
        print("Incoming /map payload:", data)
        mapped_payload = build_goodloading_payload(data)
        print("Mapped Goodloading payload:", mapped_payload)

        
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