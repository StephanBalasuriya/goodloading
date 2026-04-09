from fastapi import HTTPException
import requests

from config import GOODLOADING_RECOMMEND_URL, GOODLOADING_URL, HEADERS
from payload_mapper import build_goodloading_payload


def calculate_loading(data: dict):
    try:
        response = requests.post(
            GOODLOADING_URL,
            json=data,
            headers=HEADERS,
        )

        if response.status_code == 200:
            return response.json()
        if response.status_code == 400:
            raise HTTPException(status_code=400, detail="Validation Error")
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Unauthorized")
        if response.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        raise HTTPException(status_code=500, detail=response.text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def recommend_loading(data: dict):
    try:
        response = requests.post(
            GOODLOADING_RECOMMEND_URL,
            json=data,
            headers=HEADERS,
        )
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def map_loading(data: dict):
    try:
        print("Incoming /map payload:", data)
        mapped_payload = build_goodloading_payload(data)
        print("Mapped Goodloading payload:", mapped_payload)

        response = requests.post(
            GOODLOADING_URL,
            json=data,
            headers=HEADERS,
        )

        if response.status_code == 200:
            return response.json()
        if response.status_code == 400:
            raise HTTPException(status_code=400, detail="Validation Error")
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Unauthorized")
        if response.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        raise HTTPException(status_code=500, detail=response.text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
