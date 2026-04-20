# api_handle

FastAPI proxy service for Goodloading external calculation APIs.

## Endpoints

- `POST /calculate` -> forwards to `https://api.goodloading.com/api/external/calculation`
- `POST /recommend` -> forwards to `https://api.goodloading.com/api/external/calculation/recommendation`
- `POST /map` -> currently logs incoming payload and returns a placeholder response

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

## Run

```bash
cd /home/stephan/Documents/Goodloading/api_handle
source .venv/bin/activate
python app.py
```

Default runtime values:

- Host: `0.0.0.0`
- Port: `8001`
- Reload: `true`

Optional overrides:

```bash
HOST=127.0.0.1 PORT=9001 RELOAD=false python app.py
```

## Quick Test Commands

Test `/map`:

```bash
curl -i -X POST http://127.0.0.1:8001/map \
	-H "Content-Type: application/json" \
	-d '{"ping": true}'
```

Test `/recommend`:

```bash
curl -i -X POST http://127.0.0.1:8001/recommend \
	-H "Content-Type: application/json" \
	-d '{"loads": [], "loadspaces": []}'
```

## Notes

- Current token is hardcoded in `app.py`. For production, move it to an environment variable.
- The dependency filename is `requirment.txt` in this project.
