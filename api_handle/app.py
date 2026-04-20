from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
from services.goodloading_service import calculate_loading, map_loading, recommend_loading
from services.gmpro_service import get_gmpro_response, handle_gmpro_response

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
@app.post("/calculate")
def calculate_loading_endpoint(data: dict):
    return calculate_loading(data)

@app.post("/recommend")
def recommend_loading_endpoint(data: dict):
    return recommend_loading(data)
    
@app.post("/map")
def map_loading_endpoint(data: dict):
    return map_loading(data)
    
@app.post("/GMPROResponse")
def handle_gmpro_response_endpoint(data: dict):
    return handle_gmpro_response(data)


@app.get("/GMPROResponse")
def get_gmpro_response_endpoint():
    return get_gmpro_response()


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8001")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
    )