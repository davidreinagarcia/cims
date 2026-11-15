<!-- summary: Steps to host the live alerts server on Alexandria (compose service + nginx /api proxy). Not applied automatically. -->
# Hosting the alerts server

Add to `/opt/docker/infra/docker-compose.yml`:

```yaml
  cims-api:
    image: node:22-alpine
    container_name: cims-api
    restart: unless-stopped
    working_dir: /app
    command: node alerts-server.mjs
    environment:
      - CIMS_DATA_DIR=/data
      - CIMS_POLICE_KEY=${CIMS_POLICE_KEY}   # set in infra/.env, never in git
    volumes:
      - /home/david/deploy/cims/server:/app:ro
      - /home/david/cims-api-data:/data
    networks: [infra]
```

Add inside the `server {}` of `cims-nginx.conf` and `cims-previews-nginx.conf` (before `location /`):

```nginx
    location /api/ {
        proxy_pass http://cims-api:8787;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header X-Forwarded-For $http_cf_connecting_ip;
        proxy_buffering off;
        proxy_read_timeout 1h;
    }
```

Then `docker compose up -d cims-api cims-frontend cims-previews`. The deploy clone only has `server/` after this branch reaches `main`.
