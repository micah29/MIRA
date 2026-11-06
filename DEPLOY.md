# Deploy MIRA to mira.solaraccess.id (VPS with Docker)

## 0. Before you start (one time)
1. **DNS:** add an **A record** `mira` → the VPS's public IP (same IP as VIRA). Check later with `ping mira.solaraccess.id`.
2. **On the VPS (SSH)**, check what's there:
   ```bash
   docker --version && docker compose version     # Docker installed?
   sudo ss -tlnp | grep -E ':80 |:443 |:8081 '      # who uses ports 80/443 (probably Nginx for VIRA) and is 8081 free?
   ls /etc/nginx/sites-enabled/ 2>/dev/null        # is VIRA behind a host Nginx?
   ```
   If Docker is missing: `curl -fsSL https://get.docker.com | sudo sh`
   If VIRA uses Caddy, Traefik or Nginx Proxy Manager instead of host Nginx, adapt step 5 to that tool (point mira.solaraccess.id → 127.0.0.1:8081).

## 1. Upload the project
Upload the whole `elina` folder **without** `node_modules`, `dist` and `backend/.env`, but **with** `backend/prisma/migrations`
(created on your PC by `prisma migrate dev`). Easiest from Windows: **WinSCP** to `/opt/mira` (or your home folder).

## 2. Configure
```bash
cd /opt/mira
cp .env.prod.example .env
nano .env        # fill passwords, JWT_SECRET, SMTP, storekeeper email
```
Generate random values with: `openssl rand -hex 24`

## 3. Build and start
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f backend     # wait for "MIRA API running", then Ctrl+C
```

## 4. Load data (first time only)
```bash
docker compose -f docker-compose.prod.yml exec backend npm run seed
curl -s http://127.0.0.1:8081/api/auth/me      # {"message":"Unauthorized","statusCode":401} = working
```

## 5. Domain + HTTPS (host Nginx)
```bash
sudo cp deploy/nginx-mira.solaraccess.id.conf /etc/nginx/sites-available/mira.solaraccess.id
sudo ln -s /etc/nginx/sites-available/mira.solaraccess.id /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d mira.solaraccess.id     # free HTTPS certificate, auto-renews
```
Open **https://mira.solaraccess.id**. The phone camera scanner works here because it's HTTPS.

## 6. Right after go-live
- Sign in as admin@mira.local → **Users**: create real accounts, then untick **Active** on the 4 demo accounts.
- Fill holder emails (People / user full names).

## Everyday commands
| Task | Command |
|---|---|
| Status | `docker compose -f docker-compose.prod.yml ps` |
| Logs | `docker compose -f docker-compose.prod.yml logs -f backend` |
| Update after uploading new code | `docker compose -f docker-compose.prod.yml up -d --build` |
| Restart | `docker compose -f docker-compose.prod.yml restart` |
| Stop | `docker compose -f docker-compose.prod.yml down` (data is kept) |
| Backup database | `docker compose -f docker-compose.prod.yml exec -T db pg_dump -U elina elina_db > elina_$(date +%F).sql` |
| Restore backup | `cat elina_2026-10-14.sql \| docker compose -f docker-compose.prod.yml exec -T db psql -U elina elina_db` |

Never run `docker compose down -v` — the `-v` deletes the database volume.
