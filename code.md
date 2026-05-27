Deployment for `stack360.l360.lk` and `stack360-be.l360.lk`

Backend systemd service:  sudo nano /etc/systemd/system/stack360.service

```ini
[Unit]
Description=Stack360 Goodloading API
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/apps/goodloading/api_handle
EnvironmentFile=/home/ubuntu/apps/goodloading/api_handle/.env
Environment=HOST=127.0.0.1
Environment=PORT=8002
Environment=RELOAD=false
ExecStart=/home/ubuntu/apps/goodloading/api_handle/.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8002
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Service control:

```bash
sudo systemctl daemon-reload
sudo systemctl start stack360
sudo systemctl restart stack360
sudo systemctl stop stack360
sudo systemctl enable stack360
sudo systemctl status stack360
```

Steps to host the project:

1. Create the backend virtualenv and install dependencies in `/home/ubuntu/apps/goodloading/api_handle`.
2. Create `/home/ubuntu/apps/goodloading/api_handle/.env` with `DATABASE_URL` and `GOODLOADING_ACCESS_TOKEN`.
3. Save the systemd service file as `/etc/systemd/system/stack360.service`.
4. Run `sudo systemctl daemon-reload` and `sudo systemctl enable stack360`.
5. Start the backend with `sudo systemctl start stack360` and verify it with `sudo systemctl status stack360`.
6. Build the frontend from `/home/ubuntu/apps/goodloading/UI`.
7. Place the Nginx site blocks in `/etc/nginx/sites-available/stack360` and enable them.
8. Test and reload Nginx with `sudo nginx -t` and `sudo systemctl reload nginx`.

Frontend build:

```bash
cd /home/ubuntu/apps/goodloading/UI
npm ci
VITE_API_HANDLE_BASE_URL=https://stack360-be.l360.lk npm run build
```

Nginx frontend site block:   sudo nano /etc/nginx/sites-available/stack360

```nginx
server {
	listen 80;
	server_name stack360.l360.lk;

	root /home/ubuntu/apps/goodloading/UI/dist;
	index index.html;

	location / {
		try_files $uri $uri/ /index.html;
	}
}
```

Nginx backend site block:

```nginx
server {
	listen 80;
	server_name stack360-be.l360.lk;

	location / {
		proxy_pass http://127.0.0.1:8002;
		proxy_http_version 1.1;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
	}
}
```

Bring it up:

```bash
sudo systemctl daemon-reload
sudo systemctl enable stack360
sudo systemctl restart stack360
sudo nginx -t
sudo systemctl reload nginx
```

Notes:

- Keep the backend CORS origin set to `https://stack360.l360.lk`.
- If you serve the frontend from another directory, update the Nginx `root` path accordingly.