# Goodloading UI

React + TypeScript + Vite front end for the Goodloading workflow.

## What It Does

The UI provides three main entry points:

- Home planner screen for starting the loading flow and submitting GMPRO response JSON
- Optimization screen for building Goodloading payloads from GMPRO routes and CSV loads
- Optimization response screen for reviewing the backend result payloads

The app uses React Router and shared loading context to move data between the planning, optimization, and response views.

## Setup

```bash
cd /home/stephan/Documents/Goodloading/UI
npm install
```

## Run

```bash
cd /home/stephan/Documents/Goodloading/UI
npm run dev
```

The app runs on Vite's default development server, usually `http://localhost:5173`.

## Environment

The UI talks to the backend through the base URL configured in [src/config/api.ts](src/config/api.ts).

Default values:

- `VITE_API_HANDLE_BASE_URL=https://stack360-be.l360.lk`
- `VITE_VEHICLES_API_BASE_URL` falls back to `VITE_API_HANDLE_BASE_URL`

For local development, you can point the UI at the backend process directly with `VITE_API_HANDLE_BASE_URL=http://127.0.0.1:8002`.

If you need to point the UI at another backend, set those environment variables in a local `.env` file.

## Available Routes

- `/` Home planner screen
- `/optimize` optimization workflow
- `/optimize-response` response viewer

## Notes

- The UI expects the backend API to allow CORS from `http://localhost:5173` or `http://127.0.0.1:5173`
- The optimization flow uses the backend endpoints `/GMPROResponse`, `/vehicles/used`, and `/calculate`
- The project uses Vite, ESLint, and TypeScript; run `npm run build` and `npm run lint` before shipping changes
