# Goodloading UI

React + TypeScript + Vite frontend for the Stack360 / Goodloading platform, served at **https://stack360.l360.lk**.

## What It Does

- **Authentication** — organization signup (OTP-verified), login, and app user login
- **Home planner** — start the loading workflow and submit GMPRO response JSON
- **Optimization screen** — build Goodloading payloads from GMPRO routes and CSV loads
- **Optimization response** — review backend result payloads with 2D and 3D viewers
- **Vehicles** — manage the organization's vehicle fleet (CRUD)
- **Users & Activity** — view app users, their calculation activity, and create/delete users (admin only)

## Setup

```bash
cd /var/www/html/goodloading/UI
npm install
```

## Run (development)

```bash
npm run dev
```

The dev server runs on `http://localhost:5173` by default.

## Build (production)

```bash
npm run build
```

The build output goes to `dist/`. Nginx serves this directory for `https://stack360.l360.lk`.

The production build automatically picks up [.env.production](.env.production):

```env
VITE_API_HANDLE_BASE_URL=https://stack360-be.l360.lk
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_HANDLE_BASE_URL` | `http://127.0.0.1:8002` | Backend API base URL |
| `VITE_VEHICLES_API_BASE_URL` | falls back to `VITE_API_HANDLE_BASE_URL` | Vehicles API base URL |

- Local dev uses the defaults (no `.env` file needed)
- Production build uses `.env.production` which points to `https://stack360-be.l360.lk`

## Available Routes

| Path | Description |
|---|---|
| `/` | Home planner screen |
| `/optimize` | Optimization workflow |
| `/optimize-response` | Response viewer |
| `/vehicles` | Vehicle management |
| `/users-activity` | Users & activity logs (organization admin) |

## Notes

- The backend must allow CORS from the frontend origin — see `api_handle/app.py`
- The optimization flow uses `/GMPROResponse`, `/vehicles/used`, and `/calculate`
- Run `npm run build` and `npm run lint` before deploying changes
- TypeScript strict mode is enabled — all unused imports and variables must be removed before a build succeeds
