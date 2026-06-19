# api_handle

FastAPI backend service for the Goodloading / Stack360 platform. It handles authentication, organization and user management, vehicle management, loading calculations via the external Goodloading API, GMPRO response caching, and database initialisation.

## Endpoints

### Auth
- `POST /api/auth/organization/signup-otp` → sends OTP to verify organization email before signup
- `POST /api/auth/organization/verify-otp` → verifies OTP and creates the organization account
- `POST /api/auth/login` → authenticates organization or app user, returns JWT
- `POST /api/auth/user/signup-otp` → sends OTP for app user signup
- `POST /api/auth/user/verify-otp` → verifies OTP and creates app user

### Organization & Users
- `GET /api/organization/users` → lists all users and activity logs for the authenticated organization
- `POST /api/organization/users` → creates a new app user under the organization (credentials emailed)
- `DELETE /api/organization/users/{user_id}` → deletes an app user

### Vehicles
- `GET /vehicles/` → lists all vehicles for the authenticated organization
- `POST /vehicles/` → creates a new vehicle
- `PUT /vehicles/{vehicle_id}` → updates a vehicle
- `DELETE /vehicles/{vehicle_id}` → deletes a vehicle

### Loading / GMPRO
- `POST /calculate` → forwards payload to `https://api.goodloading.com/api/external/calculation`
- `POST /recommend` → forwards payload to `https://api.goodloading.com/api/external/calculation/recommendation`
- `POST /map` → processes loading mapping data
- `POST /GMPROResponse` → stores GMPRO optimization response
- `GET /GMPROResponse` → retrieves the last cached GMPRO response (TTL controlled by `GMPRO_RESPONSE_TTL_SECONDS`)
- `GET /vehicles/used` → returns vehicles used in the last GMPRO optimization result

## Requirements

Dependencies are listed in `requirment.txt`. The backend uses:

- `fastapi` and `uvicorn` — API server
- `sqlalchemy` and `psycopg2` — PostgreSQL ORM and driver
- `python-dotenv` — `.env` loading
- `requests` — outbound Goodloading API calls
- `python-jose` / `passlib` — JWT and password hashing
- `resend` — transactional email (OTP and invitation emails)

## Setup

```bash
cd /var/www/html/goodloading/api_handle
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirment.txt
```

## Environment

Create or update `api_handle/.env`:

```env
GOODLOADING_ACCESS_TOKEN=your_api_token_here
GMPRO_RESPONSE_TTL_SECONDS=600

PORT=8002
HOST=127.0.0.1

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=Goodloading
DB_USER=Stack360
DB_PASSWORD=your_password_here

RESEND_API_KEY=your_resend_key_here
```

> **Note:** `DB_PORT` must be `5432` (PostgreSQL). The app uses `psycopg2` — it cannot connect to MySQL (port 3306).

## Database

The app connects to **PostgreSQL**. On first startup it auto-creates the `Goodloading` database (if missing) and runs `db.sql` to create all required tables:

- `organizations`
- `app_users`
- `otp_verifications`
- `organization_credentials`
- `gmpro_responses`
- `vehicle_types`
- `vehicle_specs`

### Create the PostgreSQL user and database (one-time)

```bash
sudo -u postgres psql
```

```sql
CREATE USER "Stack360" WITH PASSWORD 'your_password';
CREATE DATABASE "Goodloading" OWNER "Stack360";
GRANT ALL PRIVILEGES ON DATABASE "Goodloading" TO "Stack360";
\q
```

## CORS

The API currently allows requests from:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:5174`
- `http://127.0.0.1:5174`
- `http://localhost:5175`
- `http://127.0.0.1:5175`
- `https://stack360.l360.lk` ← production frontend

Update the `CORSMiddleware` configuration in [app.py](app.py) if the UI is served from another origin.

## Run (development)

```bash
cd /var/www/html/goodloading/api_handle
source .venv/bin/activate
python app.py
```

Default runtime values (from `.env`):

- Host: `127.0.0.1`
- Port: `8002`

## Run (production — systemd)

The backend runs as a `systemd` service. See [../code.md](../code.md) for the full deployment guide.

```bash
sudo systemctl restart stack360
sudo systemctl status stack360
```

## Quick Test Commands

Test connectivity:

```bash
curl -i http://127.0.0.1:8002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

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
