from __future__ import annotations

from typing import Any


def _to_positive_int(value: Any, default: int = 1) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return number if number > 0 else default


def _to_non_negative_int(value: Any, default: int = 0) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return number if number >= 0 else default


def _to_number(value: Any, default: float = 0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "y"}:
            return True
        if normalized in {"false", "0", "no", "n"}:
            return False
    return default


def build_goodloading_payload(data: dict[str, Any]) -> dict[str, Any]:
    loads = []
    for index, load in enumerate(data.get("loads", []), start=1):
        if not isinstance(load, dict):
            continue

        stacking = _to_bool(load.get("stack"), False)
        max_weight_on_top = _to_number(load.get("max_stack_weight"), 0)

        mapped_load = {
            "id": load.get("id", index),
            "quantity": _to_positive_int(load.get("quantity"), 1),
            "name": str(load.get("name", "")).strip(),
            "length": _to_number(load.get("length_cm"), 0),
            "width": _to_number(load.get("width_cm"), 0),
            "height": _to_number(load.get("height_cm"), 0),
            "weight": _to_number(load.get("weight_kg"), 0),
            "priority": _to_non_negative_int(load.get("priority"), 0),
            "stacking": stacking,
            "allowToRotate": True,
        }

        if stacking:
            mapped_load["alongFloor"] = _to_bool(load.get("arrange_on_floor"), False)
            if max_weight_on_top > 0:
                mapped_load["maxWeightOnTop"] = max_weight_on_top

        loads.append(mapped_load)

    loading_spaces = []
    for index, vehicle in enumerate(data.get("loadspaces", []), start=1):
        if not isinstance(vehicle, dict):
            continue

        quantity = _to_positive_int(vehicle.get("selected_quantity") or vehicle.get("quantity"), 1)
        part = {
            "length": _to_number(vehicle.get("length_cm"), 0),
            "width": _to_number(vehicle.get("width_cm"), 0),
            "height": _to_number(vehicle.get("height_cm"), 0),
            "limit": _to_number(vehicle.get("max_weight_kg"), 0),
        }

        loading_spaces.append(
            {
                "quantity": quantity,
                "name": str(vehicle.get("name", f"Vehicle {index}")),
                "type": vehicle.get("type", "vehicle"),
                "parts": [part],
            }
        )

    options = data.get("options") if isinstance(data.get("options"), dict) else {}

    return {
        **({"name": data["name"]} if isinstance(data.get("name"), str) and data.get("name") else {}),
        **({"note": data["note"]} if isinstance(data.get("note"), str) and data.get("note") else {}),
        "loads": loads,
        "loadingSpaces": loading_spaces,
        "options": {
            "allowOverweight": _to_bool(options.get("allowOverweight"), False),
            "unit": options.get("unit", "cm"),
            "keepLoadsTogether": _to_bool(options.get("keepLoadsTogether"), False),
            "newAlgorithm": _to_bool(options.get("newAlgorithm"), True),
            "loadingOrder": options.get("loadingOrder", "default"),
            "multiStops": _to_bool(options.get("multiStops"), False),
            "arrangeOptimally": _to_bool(options.get("arrangeOptimally"), False),
        },
    }