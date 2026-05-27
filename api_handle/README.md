# api_handle

FastAPI proxy service for the Goodloading external calculation APIs.

## Endpoints

- `GET /` -> basic health response with docs link
- `GET /doc` -> redirects to FastAPI docs at `/docs`
- `POST /calculate` -> forwards to `https://api.goodloading.com/api/external/calculation`
- `POST /recommend` -> forwards to `https://api.goodloading.com/api/external/calculation/recommendation`
- `POST /map` -> processes loading mapping data
- `POST /GMPROResponse` -> stores the latest GMPRO optimization response
- `GET /GMPROResponse` -> retrieves the cached GMPRO response
- `GET /vehicles/used` -> returns vehicles used in the latest GMPRO optimization result

## Requirements

Install the dependencies listed in [requirment.txt](requirment.txt).

## Setup

Run the commands from the [api_handle](.) directory, not the repository root:

```bash
cd /var/www/html/goodloading/api_handle
python3 -m venv $HOME/.venvs/goodloading-api
source $HOME/.venvs/goodloading-api/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirment.txt
```

If you need to create a `.venv` inside the repository checkout, the target directory must be writable by your user. This workspace copy of `/var/www/html/goodloading/api_handle` is root-owned, so creating `.venv` there will fail for `ubuntu` unless ownership or permissions are changed first.

## Environment

Create or update `api_handle/.env` with your database connection and access token:

```env
DATABASE_URL=postgresql://username:password@host:5432/database_name
GOODLOADING_ACCESS_TOKEN=your_api_token_here
GMPRO_RESPONSE_TTL_SECONDS=120
```

## Run

```bash
cd /var/www/html/goodloading/api_handle
source $HOME/.venvs/goodloading-api/bin/activate
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
