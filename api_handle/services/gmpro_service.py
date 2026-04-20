from fastapi import HTTPException

from services.gmpro_cache import (
    get_valid_gmpro_response,
    initialize_gmpro_cache,
    store_gmpro_response,
)
from services.gmpro_validator import _validate_gmpro_response


initialize_gmpro_cache()


def handle_gmpro_response(data: dict):
    try:
        print("Received GMPRO response:", data)
        _validate_gmpro_response(data)
        saved_payload = store_gmpro_response(data)
        return {
            "status": "success",
            "message": "GMPRO response received",
            "data": saved_payload,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_gmpro_response():
    cached_payload = get_valid_gmpro_response()
    if cached_payload is None:
        raise HTTPException(status_code=404, detail="No GMPRO response available yet")
    return cached_payload
