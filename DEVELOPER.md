# Stack360 — Developer Documentation

> **Audience:** New developers joining the project.  
> **Purpose:** Everything you need to understand the system end-to-end — architecture, data models, auth flows, frontend structure, backend services, deployment, and common tasks.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Layout](#3-repository-layout)
4. [Architecture Overview](#4-architecture-overview)
5. [Database Schema](#5-database-schema)
6. [Backend — api_handle](#6-backend--api_handle)
   - [Startup & Middleware](#startup--middleware)
   - [Auth System](#auth-system)
   - [API Endpoints Reference](#api-endpoints-reference)
   - [Services](#services)
   - [GMPRO Cache](#gmpro-cache)
7. [Frontend — UI](#7-frontend--ui)
   - [Routing](#routing)
   - [React Contexts](#react-contexts)
   - [Pages](#pages)
   - [Components](#components)
   - [API Config](#api-config)
8. [Authentication & Authorization Flow](#8-authentication--authorization-flow)
9. [Loading Optimization Workflow](#9-loading-optimization-workflow)
10. [Infrastructure & Deployment](#10-infrastructure--deployment)
11. [Environment Variables](#11-environment-variables)
12. [Local Development Setup](#12-local-development-setup)
13. [Common Tasks & How-Tos](#13-common-tasks--how-tos)
14. [Known Gotchas](#14-known-gotchas)

---

## 1. Project Overview

**Stack360** is a B2B SaaS platform for logistics optimization. It integrates with the external **Goodloading API** to compute optimal cargo loading plans for vehicles, and wraps it with:

- Multi-tenant organization accounts with sub-users
- OTP-based email verification for signup
- Vehicle fleet management per organization
- A rich frontend for planners to build, submit, and visualize load plans
- Activity tracking (calculation counts per user and organization)

**Production URLs:**
| Service | URL |
|---|---|
| Frontend | https://stack360.l360.lk |
| Backend API | https://stack360-be.l360.lk |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Routing | React Router v6 |
| Styling | Vanilla CSS (per-component) |
| Backend | Python 3.12, FastAPI, Uvicorn |
| Database | PostgreSQL 16 (via psycopg2 + SQLAlchemy) |
| Auth | Custom JWT (HS256, hand-rolled — no third-party library) |
| Password hashing | PBKDF2-HMAC-SHA256 (100,000 iterations) |
| Email | Resend API |
| Reverse proxy | Nginx |
| Process manager | systemd |
| SSL | Let's Encrypt (Certbot) |

---

## 3. Repository Layout

```
/var/www/html/goodloading/
│
├── api_handle/                  # Python FastAPI backend
│   ├── app.py                   # Main application — all routes defined here
│   ├── config.py                # Loads .env, exports constants
│   ├── db.sql                   # Database schema (auto-run on startup)
│   ├── .env                     # Secrets (NOT committed to git)
│   ├── requirment.txt           # pip dependencies (note the typo)
│   │
│   ├── db_config/
│   │   └── db.py                # SQLAlchemy engine, SessionLocal, init_db()
│   │
│   ├── services/
│   │   ├── auth_service.py      # JWT, password hashing, OTP generation
│   │   ├── email_service.py     # Resend API wrappers (OTP + invitation emails)
│   │   ├── goodloading_service.py # HTTP calls to external Goodloading API
│   │   ├── gmpro_cache.py       # In-memory + file-backed GMPRO response cache
│   │   ├── gmpro_service.py     # GMPRO-specific helpers
│   │   └── gmpro_validator.py   # Validates GMPRO response structure
│   │
│   ├── Schema/
│   │   └── schemas.py           # Pydantic schemas for vehicle types
│   │
│   ├── model/
│   │   └── models.py            # SQLAlchemy ORM models (light usage)
│   │
│   └── payload_mapper.py        # Maps raw GMPRO responses to frontend format
│
└── UI/                          # React + Vite frontend
    ├── src/
    │   ├── main.tsx             # App entry point, providers setup
    │   ├── App.tsx              # Layout shell + auth guard
    │   │
    │   ├── context/
    │   │   ├── AuthContext.tsx  # JWT auth state, login/logout/signup actions
    │   │   ├── LoadSpace.tsx    # Selected vehicles state (persisted to localStorage)
    │   │   └── LoadsContext.tsx # Loads/cargo state for optimization workflow
    │   │
    │   ├── config/
    │   │   └── api.ts           # API base URL resolution from env vars
    │   │
    │   ├── components/          # Reusable UI components (see Section 7)
    │   │
    │   ├── Home.tsx             # Home planner screen
    │   ├── Login.tsx            # Login page (org + user roles)
    │   ├── OrgSignup.tsx        # Organization signup (2-step OTP)
    │   ├── UserSignup.tsx       # App user signup (2-step OTP)
    │   ├── Optimize.tsx         # Main optimization workflow
    │   ├── OptimizeResponse.tsx # Result viewer (2D viewer, statistics, etc.)
    │   ├── VehiclesPage.tsx     # Vehicle fleet CRUD
    │   └── UsersActivityPage.tsx # User management + activity dashboard
    │
    ├── .env.production          # VITE_API_HANDLE_BASE_URL for prod builds
    └── dist/                    # Built frontend (served by Nginx)
```

---

## 4. Architecture Overview

```
 ┌─────────────────────────────────────────────┐
 │              Browser (HTTPS)                │
 │       https://stack360.l360.lk             │
 └──────────────────┬──────────────────────────┘
                    │
                    ▼
 ┌─────────────────────────────────────────────┐
 │                  Nginx                      │
 │  stack360.l360.lk  → serves UI/dist/        │
 │  stack360-be.l360.lk → proxy to :8002       │
 └──────────────────┬──────────────────────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
 ┌─────────────────┐  ┌──────────────────────────┐
 │   UI (static)   │  │   FastAPI (port 8002)     │
 │   React + Vite  │  │   Python / Uvicorn        │
 │   dist/         │  │   systemd: stack360       │
 └─────────────────┘  └──────────┬───────────────┘
                                 │
                    ┌────────────┼────────────────┐
                    │            │                │
                    ▼            ▼                ▼
            ┌─────────────┐ ┌─────────┐ ┌──────────────────┐
            │  PostgreSQL │ │  File   │ │  Goodloading API │
            │  port 5432  │ │  Cache  │ │  (external HTTPS)│
            │  Goodloading│ │gmpro_   │ │  api.goodloading │
            │  database   │ │last_    │ │  .com            │
            └─────────────┘ │response │ └──────────────────┘
                            │.json    │
                            └─────────┘
```

**Request flow:**
1. Browser fetches the React SPA from Nginx (static files)
2. React makes API calls to `https://stack360-be.l360.lk`
3. Nginx proxies these to FastAPI on `127.0.0.1:8002`
4. FastAPI reads/writes to PostgreSQL for persistent data
5. FastAPI calls the external Goodloading API for load optimization calculations
6. Optimization results are cached in memory + a local JSON file

---

## 5. Database Schema

Database: **PostgreSQL**, name: **`Goodloading`**, user: **`Stack360`**

The schema is defined in [`api_handle/db.sql`](api_handle/db.sql) and automatically applied on backend startup.

### Tables

#### `organizations`
The top-level multi-tenant entity. Each company registers one organization account.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `name` | TEXT | Company name |
| `email` | TEXT UNIQUE | Login credential |
| `password_hash` | TEXT | PBKDF2 hash (`salt:hash`) |
| `phone_number` | TEXT | Optional |
| `calc_count` | INTEGER | Direct calculations by the org account |
| `total_calc_count` | INTEGER | Total calculations across org + all users |
| `created_at` | TIMESTAMPTZ | Auto |

#### `app_users`
Team members created under an organization. They can log in and run calculations.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `name` | TEXT | Display name |
| `email` | TEXT UNIQUE | Login credential |
| `password_hash` | TEXT | PBKDF2 hash |
| `organization_id` | UUID (FK) | References `organizations.id` — CASCADE DELETE |
| `calc_count` | INTEGER | Number of calculations this user has run |
| `created_at` | TIMESTAMPTZ | Auto |

#### `otp_verifications`
Temporary table for storing OTP codes during the signup process. Records are deleted after successful verification.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `email` | TEXT | The email being verified |
| `otp_code` | TEXT | 6-digit code |
| `purpose` | TEXT | `'organization_signup'` or `'user_signup'` |
| `data` | JSONB | Signup form data pending verification |
| `expires_at` | TIMESTAMPTZ | OTPs expire after **3 minutes** |
| `created_at` | TIMESTAMPTZ | Auto |

#### `vehicle_types`
Defines vehicle model templates per organization.

| Column | Type |
|---|---|
| `id` | INTEGER (PK) |
| `organization_id` | UUID (nullable FK) |
| `name` | TEXT |
| `count` | INTEGER |
| `is_active` | BOOLEAN |
| `created_at` | TIMESTAMPTZ |

#### `vehicle_specs`
Physical specifications for each vehicle type.

| Column | Type |
|---|---|
| `id` | INTEGER (PK) |
| `type_id` | INTEGER (FK → vehicle_types) |
| `max_cbm` | NUMERIC(10,2) — cubic meters |
| `max_weight_kg` | INTEGER |
| `length_cm` | NUMERIC(10,2) |
| `width_cm` | NUMERIC(10,2) |
| `height_cm` | NUMERIC(10,2) |

#### `gmpro_responses`
Stores GMPRO optimization responses linked to a user or organization.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL (PK) | |
| `user_id` | UUID (nullable FK) | The user who submitted |
| `organization_id` | UUID (nullable FK) | If submitted by org account |
| `response` | JSONB | Full GMPRO response payload |
| `created_at` | TIMESTAMPTZ | Auto |

#### `organization_credentials`
Stores external API credentials for an organization (JSONB blob).

| Column | Type |
|---|---|
| `id` | SERIAL (PK) |
| `organization_id` | UUID (FK) |
| `credentials` | JSONB |
| `created_at` | TIMESTAMPTZ |
| `updated_at` | TIMESTAMPTZ (auto-trigger) |

### Entity Relationships

```
organizations ──< app_users          (1 org : many users)
organizations ──< gmpro_responses    (optional: org-level responses)
organizations ──< organization_credentials
app_users     ──< gmpro_responses    (optional: user-level responses)
vehicle_types ──< vehicle_specs      (1 type : many specs)
```

---

## 6. Backend — api_handle

All backend logic lives in a single file, [`app.py`](api_handle/app.py), which is ~1,090 lines. Services are extracted into the `services/` folder.

### Startup & Middleware

On startup (`@app.on_event("startup")`), the backend:
1. Calls `init_db()` which connects to PostgreSQL
2. Checks if the `Goodloading` database exists (creates it if not)
3. Runs `db.sql` to create any missing tables
4. Initialises the GMPRO in-memory cache from `gmpro_last_response.json` (if it exists and is not expired)

**CORS** is configured to allow:
- `http://localhost:5173` through `5175` (local dev)
- `https://stack360.l360.lk` (production frontend)

### Auth System

Authentication is entirely custom — **no third-party auth library**.

**Password hashing** (`services/auth_service.py`):
- Algorithm: PBKDF2-HMAC-SHA256, 100,000 iterations
- Format stored: `salt:hash` (both hex strings)
- Salt: 16-byte random hex (`secrets.token_hex(16)`)

**JWT** (`services/auth_service.py`):
- Algorithm: HS256 (custom implementation using Python `hmac` + `hashlib`)
- Secret key: `JWT_SECRET` env variable (defaults to a dev value — **change in production**)
- Token expiry: 24 hours (`86400` seconds)
- Payload contains: `id`, `name`, `email`, `role`, and for users: `organization_id`, `organization_name`

**Route protection:** The `get_current_entity` dependency uses FastAPI's `HTTPBearer` to extract the `Authorization: Bearer <token>` header and decode the JWT. Any endpoint that uses `Depends(get_current_entity)` requires a valid token.

### API Endpoints Reference

#### Auth Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/api/auth/organization/signup-otp` | No | Send OTP to org email to start signup |
| POST | `/api/auth/organization/verify-otp` | No | Verify OTP → create organization account |
| POST | `/api/auth/user/signup-otp` | No | Send OTP to start app user signup |
| POST | `/api/auth/user/verify-otp` | No | Verify OTP → create app user |
| POST | `/api/auth/login` | No | Login (org or user), returns JWT |
| GET | `/api/auth/me` | Yes | Returns current user payload from JWT |

**Login request body:**
```json
{ "email": "user@example.com", "password": "secret", "role": "organization" }
```
`role` must be `"organization"` or `"user"` — they query different tables.

#### Organization & User Management

| Method | Path | Auth Required | Description |
|---|---|---|---|
| GET | `/api/organization/users` | Yes (org) | List all users and their activity logs |
| POST | `/api/organization/users` | Yes (org) | Create a new app user (credentials emailed) |
| DELETE | `/api/organization/users/{user_id}` | Yes (org) | Delete an app user |

#### Vehicles

| Method | Path | Auth Required | Description |
|---|---|---|---|
| GET | `/vehicles/` | Yes | List vehicles for the authenticated entity's organization |
| POST | `/vehicles/` | Yes | Create a vehicle |
| PUT | `/vehicles/{id}` | Yes | Update a vehicle |
| DELETE | `/vehicles/{id}` | Yes | Delete a vehicle |

#### Loading / GMPRO

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/calculate` | Yes | Forward payload to Goodloading API, increment calc count |
| POST | `/recommend` | No | Forward to Goodloading recommendation API |
| POST | `/map` | No | Process loading map data |
| POST | `/GMPROResponse` | Yes | Store a GMPRO response (DB + in-memory cache) |
| GET | `/GMPROResponse` | No | Retrieve latest GMPRO response (if not expired) |
| GET | `/vehicles/used` | No | Return vehicles matched from the latest GMPRO result |

### Services

#### `services/auth_service.py`
- `hash_password(password)` → `"salt:hash"` string
- `verify_password(password, hashed)` → bool
- `create_jwt(payload, expires_in_seconds=86400)` → token string
- `decode_jwt(token)` → payload dict (raises ValueError if invalid/expired)
- `generate_otp()` → 6-digit string

#### `services/email_service.py`
Uses the **Resend** API (`RESEND_API_KEY` env var).
- `send_otp_email(email, otp, name, purpose)` — sends a formatted OTP email
- `send_invitation_email(email, name, temp_password, org_name)` — sends login credentials to a newly admin-created user

#### `services/goodloading_service.py`
HTTP proxy layer to the external Goodloading API. Uses the `GOODLOADING_ACCESS_TOKEN` from the `.env`.
- `calculate_loading(data)` → POST to `/api/external/calculation`
- `recommend_loading(data)` → POST to `/api/external/calculation/recommendation`
- `map_loading(data)` → local mapping logic

### GMPRO Cache

The GMPRO response cache (`services/gmpro_cache.py`) has **two layers**:

1. **In-memory** (`_latest_gmpro_response` module-level global) — fastest, lost on restart
2. **File-backed** (`gmpro_last_response.json`) — survives restarts, loaded on startup

Cache TTL is controlled by `GMPRO_RESPONSE_TTL_SECONDS` (default: 600 seconds = 10 min).

```
store_gmpro_response(payload)
  → stores in memory + writes to gmpro_last_response.json

get_valid_gmpro_response()
  → returns cached payload if not expired, else None
```

---

## 7. Frontend — UI

The frontend is a single-page React application built with Vite.

### Routing

Defined in [`src/main.tsx`](UI/src/main.tsx). Routes:

| Path | Component | Protected |
|---|---|---|
| `/login` | `Login.tsx` | No |
| `/signup` | `OrgSignup.tsx` | No |
| `/user-signup` | `UserSignup.tsx` | No |
| `/` | `Home.tsx` | Yes |
| `/optimize` | `Optimize.tsx` | Yes |
| `/optimize-response` | `OptimizeResponse.tsx` | Yes |
| `/vehicles` | `VehiclesPage.tsx` | Yes |
| `/users-activity` | `UsersActivityPage.tsx` | Yes |

**Route protection:** `App.tsx` acts as the layout wrapper for protected routes. It checks `user` from `AuthContext` — if null, it redirects to `/login`. While the token is being verified it shows a spinner.

### React Contexts

Three React contexts manage shared state:

#### `AuthContext` (`context/AuthContext.tsx`)
The central auth hub. Exposes:
- `user: UserSession | null` — the decoded user object
- `token: string | null` — the raw JWT
- `loading: boolean` — true while verifying the stored token on page load
- `login(email, password, role)` — calls `/api/auth/login`, stores token in `localStorage`
- `logout()` — clears `localStorage` and resets state
- `requestOrgSignupOtp(data)` / `verifyOrgSignupOtp(email, otp)` — org signup flow
- `requestUserSignupOtp(data)` / `verifyUserSignupOtp(email, otp)` — user signup flow

Token is stored in `localStorage` under key `stack360_token`. On page load, `AuthContext` calls `/api/auth/me` to validate the stored token.

#### `LoadSpace` (`context/LoadSpace.tsx`)
Manages the list of **selected vehicles** for the current optimization job.
- Persisted to `localStorage` under key `goodloading.loadspaces`
- The `SelectedVehicle` type: `{ name, length_cm, width_cm, height_cm, max_weight_kg, max_cbm, selected_quantity }`

#### `LoadsContext` (`context/LoadsContext.tsx`)
Manages the **cargo/loads** data for the optimization workflow. Tracks loads imported from CSV or entered manually.

### Pages

| Page | File | Purpose |
|---|---|---|
| Login | `Login.tsx` | Email + password login. Toggle between org and user role. |
| Org Signup | `OrgSignup.tsx` | 2-step: fill form → receive OTP → verify → account created |
| User Signup | `UserSignup.tsx` | Same 2-step flow. Requires the org's email to link accounts |
| Home | `Home.tsx` | Starting screen. Upload/paste GMPRO JSON response, initiate the optimization flow |
| Optimize | `Optimize.tsx` | Core workflow: select vehicles, configure loads, submit to Goodloading API |
| Optimize Response | `OptimizeResponse.tsx` | Display optimization results with 2D viewer, statistics, stop selector, loads list |
| Vehicles | `VehiclesPage.tsx` | CRUD for the organization's vehicle fleet |
| Users Activity | `UsersActivityPage.tsx` | Admin view: list users, their calculation stats. Create/delete users. |

### Components

Located in `src/components/`:

| Component | Purpose |
|---|---|
| `HeaderBar` | Top navigation bar with user info and logout |
| `Sidebar` | Left nav links (Home, Optimize, Vehicles, Users Activity) |
| `PlannerSection` | Load configuration UI used in Optimize.tsx |
| `VehicleSection` | Vehicle selection table + modal (in Optimize.tsx) |
| `VehicleForm` | Modal for selecting/adding vehicles from the fleet |
| `LoadingSpaceViewer2D` | SVG-based 2D top/side/front viewer for load placements |
| `LoadingSpaceViewer` | 3D viewer wrapper |
| `LoadsList` | Expandable list of loaded items with placement positions |
| `StatisticsPanel` | Summary card: volume %, surface %, loading meter, efficiency |
| `StopSelector` | Dropdown to filter the 2D view by delivery stop |
| `ChangePasswordModal` | Modal for changing password |
| `loadingTypes.ts` | TypeScript type definitions for loads, placements, loading spaces |
| `loadColors.ts` | Colour palette for load visualisation (consistent per load ID) |

### API Config

`src/config/api.ts` resolves the backend URL:

```typescript
export const API_HANDLE_BASE_URL =
  import.meta.env.VITE_API_HANDLE_BASE_URL ?? 'http://127.0.0.1:8002'
```

- **Local dev:** defaults to `http://127.0.0.1:8002` (no `.env` file needed)
- **Production:** `.env.production` sets it to `https://stack360-be.l360.lk`

All API calls go through the helper functions `apiHandleUrl(path)` and `vehiclesApiUrl(path)`.

---

## 8. Authentication & Authorization Flow

### Organization Signup (2 steps)

```
User fills form → POST /api/auth/organization/signup-otp
  → OTP stored in otp_verifications table (3 min TTL)
  → Email sent via Resend

User enters OTP → POST /api/auth/organization/verify-otp
  → OTP validated
  → Organization row created in organizations table
  → OTP row deleted
```

### User Signup (2 steps)

Same flow but the OTP email goes to the **organization's email address** (not the user's email) as a security check — the org admin must approve new users.

### Admin-Created Users

Organization admins can also create users directly from the Users Activity page:

```
Admin fills name + email → POST /api/organization/users
  → Random temporary password generated
  → User row created
  → Invitation email sent to user with login credentials
  → User can log in immediately (no OTP step)
```

### Login

```
POST /api/auth/login { email, password, role }
  → Queries organizations or app_users table depending on role
  → PBKDF2 password verification
  → JWT issued (24h expiry)
  → Token stored in localStorage as 'stack360_token'
```

### JWT Structure

Payload:
```json
{
  "id": "uuid",
  "name": "Company Name",
  "email": "email@example.com",
  "role": "organization",   // or "user"
  "organization_id": "uuid", // users only
  "organization_name": "...", // users only
  "iat": 1234567890,
  "exp": 1234654290
}
```

---

## 9. Loading Optimization Workflow

This is the core feature of the platform.

```
1. User pastes/uploads a GMPRO JSON response on the Home screen
   → Stored via POST /GMPROResponse (in-memory cache + DB + JSON file)

2. User navigates to /optimize
   → Selects vehicles from their fleet (VehicleSection)
   → Configures cargo loads (PlannerSection / LoadsContext)

3. User clicks "Calculate"
   → POST /calculate with the structured payload
   → FastAPI forwards to https://api.goodloading.com/api/external/calculation
   → calc_count incremented in DB for the current user/org

4. Result returned to browser
   → User navigated to /optimize-response

5. On /optimize-response
   → LoadingSpaceViewer2D renders a 2D SVG of the load placement
   → StatisticsPanel shows volume/surface/weight utilization
   → StopSelector filters by delivery stop
   → LoadsList shows all loaded items with positions
```

### GMPRO Cache TTL

After storing a GMPRO response, it remains valid for `GMPRO_RESPONSE_TTL_SECONDS` (default: 600s). After expiry:
- `GET /GMPROResponse` returns `null`
- The JSON file is deleted
- A fresh GMPRO response must be submitted before the next calculation

---

## 10. Infrastructure & Deployment

### Server

- **OS:** Ubuntu 24.04 on AWS EC2
- **Instance:** `ip-172-26-1-187`
- **Web server:** Nginx
- **App server:** Uvicorn (via systemd)

### Nginx Config (`/etc/nginx/sites-available/stack360`)

Two server blocks:
1. **Frontend:** serves `UI/dist/` as static files for `stack360.l360.lk`
2. **Backend:** proxies `stack360-be.l360.lk` → `127.0.0.1:8002`

Both use Let's Encrypt SSL certificates.

### systemd Service (`/etc/systemd/system/stack360.service`)

```ini
[Unit]
Description=Stack360 FastAPI Backend
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/var/www/html/goodloading/api_handle
EnvironmentFile=/var/www/html/goodloading/api_handle/.env
ExecStart=/var/www/html/goodloading/api_handle/.venv/bin/python app.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Deploy a Change

```bash
# 1. Pull latest
cd /var/www/html/goodloading && git pull

# 2. Backend changes (Python)
cd api_handle && source .venv/bin/activate
pip install -r requirment.txt   # only if deps changed
sudo systemctl restart stack360

# 3. Frontend changes (React)
cd ../UI && npm ci && npm run build
# dist/ is automatically served by Nginx (no restart needed)

# 4. Nginx config changes
sudo nginx -t && sudo systemctl reload nginx
```

---

## 11. Environment Variables

### Backend (`api_handle/.env`)

| Variable | Required | Description |
|---|---|---|
| `GOODLOADING_ACCESS_TOKEN` | ✅ | JWT token for the external Goodloading API |
| `GMPRO_RESPONSE_TTL_SECONDS` | ✅ | Cache lifetime in seconds (default: 600) |
| `HOST` | ✅ | Uvicorn bind host (use `127.0.0.1` in prod) |
| `PORT` | ✅ | Uvicorn port (use `8002`) |
| `DB_HOST` | ✅ | PostgreSQL host (`127.0.0.1`) |
| `DB_PORT` | ✅ | PostgreSQL port — **must be `5432`**, not 3306 |
| `DB_NAME` | ✅ | Database name (`Goodloading`) |
| `DB_USER` | ✅ | Database user (`Stack360`) |
| `DB_PASSWORD` | ✅ | Database password |
| `RESEND_API_KEY` | ✅ | Resend API key for transactional email |
| `JWT_SECRET` | ⚠️ | JWT signing secret — **MUST be set in production** |

> ⚠️ `JWT_SECRET` defaults to `"super-secret-stack360-key-replace-this"` — always override in production.

### Frontend Build

| Variable | File | Description |
|---|---|---|
| `VITE_API_HANDLE_BASE_URL` | `.env.production` | Backend URL for production builds |
| `VITE_VEHICLES_API_BASE_URL` | (optional) | Falls back to `VITE_API_HANDLE_BASE_URL` |

---

## 12. Local Development Setup

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL running locally (or a remote dev DB)

### Backend

```bash
# 1. Clone and navigate
cd /var/www/html/goodloading/api_handle

# 2. Create virtualenv
python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirment.txt

# 4. Create .env (copy from example and fill in your values)
cp .env.example .env   # or create manually

# 5. Create the PostgreSQL user and database (one-time)
sudo -u postgres psql -c "CREATE USER \"Stack360\" WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE \"Goodloading\" OWNER \"Stack360\";"

# 6. Run the backend
python app.py
# → Running on http://127.0.0.1:8002
```

### Frontend

```bash
cd /var/www/html/goodloading/UI

npm install
npm run dev
# → Running on http://localhost:5173
```

No `.env` file needed for local dev — the frontend defaults to `http://127.0.0.1:8002`.

---

## 13. Common Tasks & How-Tos

### Add a new API endpoint

1. Open `api_handle/app.py`
2. Define a Pydantic model if needed (near the top with other schemas)
3. Add the route with `@app.get(...)` or `@app.post(...)`
4. Add `db: Session = Depends(get_db)` if DB access is needed
5. Add `current_entity: dict = Depends(get_current_entity)` if auth is required

### Add a new page to the frontend

1. Create `UI/src/MyPage.tsx` and `UI/src/MyPage.css`
2. Register the route in `UI/src/main.tsx`
3. Add a `<NavLink>` in `UI/src/components/Sidebar.tsx`

### Add a new environment variable to the backend

1. Add it to `api_handle/.env`
2. Read it in `config.py` using `os.getenv("VAR_NAME", "default")`
3. Import the constant from `config.py` wherever it's needed

### Rebuild the frontend and deploy

```bash
cd /var/www/html/goodloading/UI
npm run build
# Nginx serves dist/ immediately — no service restart needed
```

### Check backend logs

```bash
sudo journalctl -u stack360 -f          # live logs
sudo journalctl -u stack360 -n 100      # last 100 lines
```

### Access the database

```bash
PGPASSWORD='yourpassword' psql -h 127.0.0.1 -p 5432 -U "Stack360" -d "Goodloading"
```

Useful queries:
```sql
-- List all organizations
SELECT id, name, email, calc_count, total_calc_count FROM organizations;

-- List all users for an org
SELECT u.name, u.email, u.calc_count FROM app_users u
JOIN organizations o ON u.organization_id = o.id
WHERE o.email = 'org@example.com';

-- Clear expired OTPs manually
DELETE FROM otp_verifications WHERE expires_at < NOW();
```

### Add a new allowed CORS origin

In `api_handle/app.py`, add the origin to the `allow_origins` list in `CORSMiddleware`, then restart the service:
```bash
sudo systemctl restart stack360
```

---

## 14. Known Gotchas

| # | Issue | Explanation |
|---|---|---|
| 1 | `DB_PORT` must be `5432` | The app uses `psycopg2` (PostgreSQL driver). Port `3306` is MySQL — connecting to it will cause an SSL negotiation error. |
| 2 | JWT_SECRET has an insecure default | The default `"super-secret-stack360-key-replace-this"` must be overridden in any non-dev environment. |
| 3 | Nginx warns about `protocol options redefined` | This is a cosmetic warning from Certbot managing port 443 twice. It does not affect functionality. |
| 4 | `requirment.txt` is misspelled | The pip requirements file is named `requirment.txt` (missing an 'e'). Don't rename it — it's referenced in the systemd unit and documentation. |
| 5 | OTP goes to org email for user signups | When a new app user self-registers, the 6-digit OTP is sent to the **organization's** email, not the user's email. This is intentional — the org admin must approve. |
| 6 | GMPRO cache is in-memory | If the backend restarts, the in-memory cache is cleared. The JSON file backup (`gmpro_last_response.json`) re-initialises the cache on startup, but only if the TTL hasn't expired. |
| 7 | TypeScript strict mode | The build (`npm run build`) fails on any unused variable or import. Always run `npm run build` locally before pushing frontend changes. |
| 8 | `max_cbm` is computed on frontend | The `SelectedVehicle` type requires `max_cbm` but the vehicles API doesn't return it. It is computed in `VehicleSection.tsx` as `(length_cm × width_cm × height_cm) / 1,000,000`. |
| 9 | Calculation count tracking | Every successful `/calculate` call increments `calc_count` on the user AND `total_calc_count` on the organization. Organisation direct calls increment both `calc_count` and `total_calc_count` on the org row. |
| 10 | No `DATABASE_URL` override in .env | The commented `DATABASE_URL` in `.env` (pointing to Render) takes precedence over the individual `DB_*` variables if uncommented. Don't uncomment it unless you want to use a remote database. |
