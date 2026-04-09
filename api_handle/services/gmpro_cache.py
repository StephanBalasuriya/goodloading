import json
import time
from typing import Any

from config import GMPRO_RESPONSE_FILE, GMPRO_RESPONSE_TTL_SECONDS

_latest_gmpro_response: dict[str, Any] | None = None
_latest_gmpro_saved_at: float | None = None


def _load_last_gmpro_response() -> tuple[dict[str, Any] | None, float | None]:
    if not GMPRO_RESPONSE_FILE.exists():
        return None, None

    try:
        content = json.loads(GMPRO_RESPONSE_FILE.read_text(encoding="utf-8"))
        if isinstance(content, dict) and "payload" in content and "saved_at" in content:
            payload = content.get("payload")
            saved_at = content.get("saved_at")
            if isinstance(payload, dict) and isinstance(saved_at, (int, float)):
                return payload, float(saved_at)
            return None, None

        if isinstance(content, dict):
            return content, time.time()

        return None, None
    except (OSError, json.JSONDecodeError):
        return None, None


def _delete_last_gmpro_response_file() -> None:
    try:
        if GMPRO_RESPONSE_FILE.exists():
            GMPRO_RESPONSE_FILE.unlink()
    except OSError:
        pass


def _save_last_gmpro_response(payload: dict[str, Any], saved_at: float) -> None:
    GMPRO_RESPONSE_FILE.write_text(
        json.dumps({"payload": payload, "saved_at": saved_at}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def get_valid_gmpro_response() -> dict[str, Any] | None:
    global _latest_gmpro_response, _latest_gmpro_saved_at

    if _latest_gmpro_response is None or _latest_gmpro_saved_at is None:
        return None

    if (time.time() - _latest_gmpro_saved_at) > GMPRO_RESPONSE_TTL_SECONDS:
        _latest_gmpro_response = None
        _latest_gmpro_saved_at = None
        _delete_last_gmpro_response_file()
        return None

    return _latest_gmpro_response


def store_gmpro_response(payload: dict[str, Any]) -> dict[str, Any]:
    global _latest_gmpro_response, _latest_gmpro_saved_at

    saved_at = time.time()
    _latest_gmpro_response = payload
    _latest_gmpro_saved_at = saved_at
    _save_last_gmpro_response(payload, saved_at)
    return payload


def initialize_gmpro_cache() -> None:
    global _latest_gmpro_response, _latest_gmpro_saved_at

    _latest_gmpro_response, _latest_gmpro_saved_at = _load_last_gmpro_response()
    if get_valid_gmpro_response() is None:
        _latest_gmpro_response = None
        _latest_gmpro_saved_at = None
