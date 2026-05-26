# api_handle

FastAPI proxy service for Goodloading external calculation APIs.

## Endpoints

- `GET /` -> basic health response with docs link
- `GET /doc` -> redirects to FastAPI docs at `/docs`
- `POST /calculate` -> forwards to `https://api.goodloading.com/api/external/calculation`
- `POST /recommend` -> forwards to `https://api.goodloading.com/api/external/calculation/recommendation`
- `POST /map` -> processes loading mapping data
- `POST /GMPROResponse` -> stores GMPRO optimization response
- `GET /GMPROResponse` -> retrieves the last cached GMPRO response
- `GET /vehicles/used` -> returns vehicles used in the last GMPRO optimization result

## Requirements

Dependencies are listed in `requirment.txt`.

## Setup


```bash
cd /home/stephan/Documents/Goodloading/api_handle
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirment.txt
```

Why `python -m pip` instead of `pip`:

- Some Windows environments block direct execution of `pip.exe` with Application Control policies.
- Running pip through `python -m pip` often works even when `pip.exe` is blocked.
- This project uses `pg8000` as the PostgreSQL driver to avoid native DLL issues that can affect `psycopg2` on locked-down Windows machines.

## Environment

Create or update `api_handle/.env` with your database connection and API token:

```env
DATABASE_URL=postgresql://username:password@host:5432/database_name
GOODLOADING_ACCESS_TOKEN=your_api_token_here
```

The `GOODLOADING_ACCESS_TOKEN` is required for authentication with the Goodloading API.

## Run

**Linux/macOS:**

```bash
cd /home/stephan/Documents/Goodloading/api_handle
source .venv/bin/activate
python app.py
```

**Windows:**

```powershell
cd D:\path\to\api_handle
.\.venv\Scripts\Activate.ps1
python app.py
```

Default runtime values:

- Host: `0.0.0.0`
- Port: `8002`
- Reload: `true`

Optional overrides:

**Linux/macOS:**

```bash
export HOST="127.0.0.1"
export PORT="9001"
export RELOAD="false"
python app.py
```

For production behind systemd, prefer `HOST=127.0.0.1`, `PORT=8002`, and `RELOAD=false`.

**Windows:**

```powershell
$env:HOST="127.0.0.1"
$env:PORT="9001"
$env:RELOAD="false"
pytCORS Configuration

The API is configured to accept requests from:
- `http://localhost:5173`
- `http://127.0.0.1:5173`

Adjust the `CORSMiddleware` configuration in `app.py` for other origins.

## Database

The API requires a PostgreSQL database. Vehicle type and specification data is read from:
- `vehicle_types` table
- `vehicle_specs` table

These tables store vehicle dimensions, weight limits, and capacity information used by the `/vehicles/used` endpoint.

## Notes

- The access token must be set via the `GOODLOADING_ACCESS_TOKEN`
## Quick Test Commands

Test `/map`:

```powershell
# api_handle

FastAPI service for the Goodloading integration. It forwards calculation requests to the external Goodloading API, caches GMPRO responses locally, and exposes vehicle data used by the UI.

## Endpoints

- `POST /calculate` forwards payloads to `https://api.goodloading.com/api/external/calculation`
- `POST /recommend` forwards payloads to `https://api.goodloading.com/api/external/calculation/recommendation`
- `POST /map` processes loading mapping data
- `POST /GMPROResponse` stores the latest GMPRO optimization response
- `GET /GMPROResponse` returns the cached GMPRO response if one is available
- `GET /vehicles/used` returns the vehicle rows matched from the latest GMPRO optimization result

## Requirements

Install the Python dependencies listed in [requirment.txt](requirment.txt).

The backend uses:

- `fastapi` and `uvicorn` for the API server
- `requests` for outbound Goodloading API calls
- `sqlalchemy` and `psycopg2` for PostgreSQL access
- `python-dotenv` for `.env` loading

## Setup

```bash
cd /home/stephan/Documents/Goodloading/api_handle
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirment.txt
```

## Environment

Create `api_handle/.env` with your database connection and access token:

```env
DATABASE_URL=postgresql://username:password@host:5432/database_name
GOODLOADING_ACCESS_TOKEN=your_api_token_here
GMPRO_RESPONSE_TTL_SECONDS=120
```

`GOODLOADING_ACCESS_TOKEN` is required for requests to the Goodloading API. `GMPRO_RESPONSE_TTL_SECONDS` controls how long the cached GMPRO response stays valid.

## Run

```bash
cd /home/stephan/Documents/Goodloading/api_handle
source .venv/bin/activate
python app.py
```

Default runtime values:

- Host: `0.0.0.0`
- Port: `8002`
- Reload: `true`

Optional overrides:

```bash
export HOST="127.0.0.1"
export PORT="9001"
export RELOAD="false"
python app.py
```

## CORS

The API currently allows requests from:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

Update the `CORSMiddleware` configuration in [app.py](app.py) if the UI is served from another origin.

## Database

The `/vehicles/used` endpoint reads from PostgreSQL tables named `vehicle_types` and `vehicle_specs`.

Those tables are expected to store vehicle dimensions, weight limits, capacity, and active-state data used to match GMPRO vehicle labels.

## Quick Test Commands

Test `/map`:

```bash
curl -i -X POST http://127.0.0.1:8002/map \
  -H "Content-Type: application/json" \
  -d '{"ping": true}'
```

Test `/recommend`:

```bash
curl -i -X POST http://127.0.0.1:8002/recommend \
  -H "Content-Type: application/json" \
  -d '{"loads": [], "loadspaces": []}'
```
