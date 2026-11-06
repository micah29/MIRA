# MIRA — Engineering Tool Monitor

Stack (same as VIRA): **NestJS + Prisma + PostgreSQL + JWT/Passport/bcrypt** (backend) and **React + Vite + Tailwind** (frontend), styled with the VIRA design system.

```
elina/
├── docker-compose.dev.yml   PostgreSQL for local development
├── backend/                 NestJS API  → http://localhost:3000/api
│   ├── prisma/schema.prisma Database tables (assets, transactions, calibrations, users, people, sites, sections)
│   ├── prisma/seed.ts       Imports your 91 assets + people + demo users
│   └── src/                 auth, assets, calibrations, dashboard, reminders (cron), mail, lookups, users, transactions
└── frontend/                React app → http://localhost:5173
```

## Windows: the easy way
1. Install **Node.js 20 LTS** (nodejs.org) and **PostgreSQL 16** (postgresql.org/download/windows). Remember the postgres password and port.
2. Double-click **setup.bat** once and answer the port and password questions.
3. Double-click **start.bat** whenever you want to run MIRA.

## Run it locally (first time)

Requirements: **Node.js 20+** and **Docker** (or an existing PostgreSQL; on the VPS you can reuse VIRA's PostgreSQL with a new database `elina_db`).

```bash
# 1. Database
docker compose -f docker-compose.dev.yml up -d

# 2. Backend
cd backend
npm install
cp .env.example .env            # already copied in this package; edit if needed
npx prisma migrate dev --name init
npm run seed                    # 91 assets, people, demo users
npm run start:dev               # API on http://localhost:3000/api

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                     # open http://localhost:5173
```

### Demo logins (password: `mira1234`)
| Email | Role | Can do |
|---|---|---|
| admin@mira.local | ADMIN | Everything, users, manual reminder runs |
| muzakki@mira.local | STOREKEEPER | Check out/in, calibration, maintenance, labels |
| engineer@mira.local | ENGINEER | View, check out, reassign, reserve, report lost |
| manager@mira.local | MANAGEMENT | Read-only dashboard and lists |

Change these passwords (or delete the users) before going live.

## Key rules built in
- **PIC = current holder.** Check-out writes the borrower into PIC/Section; check-in hands the asset back to the storekeeper (`STOREKEEPER_NAME` in `.env`).
- **Only On Loan has a return date**; only On Loan can be overdue.
- **Calibration auto-update:** `POST /api/assets/:id/calibrations` with result ACCEPT sets `calDue = calibratedAt + intervalMonths` in the same DB transaction as the calibration record. REJECT moves an in-store asset to Maintenance.
- **Expired calibration blocks** check-out and reassign (checked on the server).
- **No double booking:** status changes only succeed if the asset hasn't changed since it was opened (HTTP 409 otherwise).
- **Dashboard counts records, not Qty.**

## Scheduled jobs (replace Power Automate)
In `src/reminders/reminders.service.ts`, timezone Asia/Jakarta:
- Daily 08:00: email holders of overdue On Loan assets (CC storekeeper) and log a REMINDER.
- Monday 08:00: calibration-due summary to `CALIBRATION_REPORT_TO`.
- Instant: damaged/broken check-in and lost reports email the storekeeper.

Without `SMTP_HOST`, emails are printed to the backend console. To test now, log in as admin and call
`POST /api/reminders/overdue/run` or `POST /api/reminders/calibration/run`.

## Main API endpoints
| Method | Path | Who |
|---|---|---|
| POST | /api/auth/login | all |
| GET | /api/dashboard/summary | all |
| GET | /api/assets?search=&status=&category=&section=&attention=overdue\|damaged\|calibration | all |
| GET | /api/assets/:id | all |
| POST | /api/assets | storekeeper |
| POST | /api/assets/:id/checkout `{type, pic, section, inspectionSite?, dueBack?, note?}` | engineer, storekeeper |
| POST | /api/assets/:id/checkin `{condition, note?}` | storekeeper |
| POST | /api/assets/:id/reserve, /cancel-reservation, /lost | engineer, storekeeper |
| POST | /api/assets/:id/found, /maintenance, /repaired, /dispose, /remind | storekeeper |
| POST | /api/assets/:id/calibrations (multipart, optional `file`) | storekeeper |
| GET | /api/calibrations, /api/calibrations/due?days=30 | all |
| GET | /api/transactions?search= | all |
| GET | /api/lookups | all |
| GET/POST/PATCH | /api/users | admin |

## Deploy to the VPS
See **DEPLOY.md** (Docker Compose + host Nginx + HTTPS for mira.solaraccess.id).

## Notes
- Phone camera scanning needs **HTTPS** (or `localhost`). For testing on a phone on the same Wi-Fi, use the VPS with HTTPS later, or a tunnel.
- shadcn/ui can be added later (`npx shadcn@latest init`); the current components are plain Tailwind using the VIRA tokens in `tailwind.config.js`, so they can be swapped one by one.
