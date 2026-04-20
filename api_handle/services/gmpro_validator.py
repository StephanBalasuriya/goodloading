from fastapi import HTTPException
from typing import Any


def _validate_gmpro_response(payload: dict[str, Any]) -> None:
    errors: list[str] = []

    routes = payload.get("routes")
    if not isinstance(routes, list) or not routes:
        errors.append("Top-level field 'routes' must be a non-empty array.")

    metrics = payload.get("metrics")
    if not isinstance(metrics, dict):
        errors.append("Top-level field 'metrics' must be an object.")
    else:
        required_metrics_fields = [
            "aggregatedRouteMetrics",
            "usedVehicleCount",
            "earliestVehicleStartTime",
            "latestVehicleEndTime",
        ]
        for field in required_metrics_fields:
            if field not in metrics:
                errors.append(f"metrics.{field} is required.")

        aggregated = metrics.get("aggregatedRouteMetrics")
        if not isinstance(aggregated, dict):
            errors.append("metrics.aggregatedRouteMetrics must be an object.")
        else:
            for field in ["performedShipmentCount", "totalDuration", "travelDistanceMeters"]:
                if field not in aggregated:
                    errors.append(f"metrics.aggregatedRouteMetrics.{field} is required.")

    if isinstance(routes, list):
        for idx, route in enumerate(routes):
            if not isinstance(route, dict):
                errors.append(f"routes[{idx}] must be an object.")
                continue

            if not isinstance(route.get("vehicleLabel"), str) or not route.get("vehicleLabel"):
                errors.append(f"routes[{idx}].vehicleLabel is required and must be a string.")

            has_detailed_route = any(k in route for k in ("visits", "transitions", "metrics"))
            if has_detailed_route:
                if not isinstance(route.get("visits"), list):
                    errors.append(f"routes[{idx}].visits must be an array for detailed routes.")
                if not isinstance(route.get("transitions"), list):
                    errors.append(f"routes[{idx}].transitions must be an array for detailed routes.")
                if not isinstance(route.get("metrics"), dict):
                    errors.append(f"routes[{idx}].metrics must be an object for detailed routes.")

                visits = route.get("visits")
                if isinstance(visits, list):
                    for visit_idx, visit in enumerate(visits):
                        if not isinstance(visit, dict):
                            errors.append(f"routes[{idx}].visits[{visit_idx}] must be an object.")
                            continue

                        if "startTime" not in visit:
                            errors.append(f"routes[{idx}].visits[{visit_idx}].startTime is required.")
                        if "shipmentLabel" not in visit:
                            errors.append(
                                f"routes[{idx}].visits[{visit_idx}].shipmentLabel is required."
                            )

                        load_demands = visit.get("loadDemands")
                        if not isinstance(load_demands, dict):
                            errors.append(
                                f"routes[{idx}].visits[{visit_idx}].loadDemands must be an object."
                            )
                        else:
                            weight = load_demands.get("weight")
                            if not isinstance(weight, dict) or "amount" not in weight:
                                errors.append(
                                    f"routes[{idx}].visits[{visit_idx}].loadDemands.weight.amount is required."
                                )

    if errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Invalid GMPRO response format.",
                "errors": errors,
            },
        )
