# Goodloading Vehicles API

FastAPI backend for managing vehicles (loading spaces) in the Goodloading application.

## Project Structure

```
Vehicles/
├── app.py                  # FastAPI application & CRUD endpoints
├── requirements.txt        # Python dependencies
├── SQL_QUERY.sql          # Database schema
├── .env.example           # Environment configuration template
├── db_config/
│   └── db.py              # SQLAlchemy database configuration
├── model/
│   └── models.py          # SQLAlchemy ORM models
└── Schema/
    └── schemas.py         # Pydantic request/response schemas
```

## Setup Instructions

### 1. Create Database Table

Run the SQL query in MySQL:

```bash
mysql -u root -p Goodloading < SQL_QUERY.sql
```

Or manually execute the contents of [SQL_QUERY.sql](SQL_QUERY.sql).

### 2. Set Up Virtual Environment

```bash
cd /home/stephan/Documents/Goodloading/Vehicles
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Server

```bash
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

All endpoints return JSON responses.

### Create Vehicle
```
POST /vehicles/
Content-Type: application/json

{
  "name": "Vehicle 1",
  "length_m": 5.0,
  "width_cm": 250,
  "height_cm": 200,
  "weight_kg": 500,
  "max_weight_kg": 2000
}
```

### Get All Vehicles
```
GET /vehicles/
```

### Get Single Vehicle
```
GET /vehicles/{vehicle_id}
```

### Update Vehicle
```
PUT /vehicles/{vehicle_id}
Content-Type: application/json

{
  "name": "Updated Vehicle",
  "length_m": 6.0,
  "width_cm": 280,
  "height_cm": 210,
  "weight_kg": 600,
  "max_weight_kg": 2500
}
```

### Delete Vehicle
```
DELETE /vehicles/{vehicle_id}
```

## Access Interactive Documentation

- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

## Database Configuration

Default connection string:
```
mysql+pymysql://root:1212@localhost/Goodloading
```

To change credentials, edit [db_config/db.py](db_config/db.py).

## Fields Reference

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| id | Integer | - | Unique identifier (auto-generated) |
| name | String (100) | - | Vehicle name |
| length_m | Float | meters | Vehicle length |
| width_cm | Float | centimeters | Vehicle width |
| height_cm | Float | centimeters | Vehicle height |
| weight_kg | Float | kilograms | Vehicle weight (empty) |
| max_weight_kg | Float | kilograms | Maximum weight capacity |
| created_at | DateTime | - | Record creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

## Response Format

All successful responses include the vehicle object:

```json
{
  "id": 1,
  "name": "Vehicle 1",
  "length_m": 5.0,
  "width_cm": 250,
  "height_cm": 200,
  "weight_kg": 500,
  "max_weight_kg": 2000,
  "created_at": "2026-03-31T10:30:45.123456",
  "updated_at": "2026-03-31T10:30:45.123456"
}
```

Error responses include detail message:

```json
{
  "detail": "Vehicle not found"
}
```

## Status Codes

- `200` - Success (GET, PUT)
- `201` - Created (POST)
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error
