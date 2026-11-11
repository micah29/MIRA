# MIRA update — RBAC, Approvals, Dashboard layout, New logo

This update changes the **database schema** (adds a `BorrowRequest` table), so it needs one
extra step compared to earlier updates: generating a migration file. Do the steps in order.

## What's in this update
1. Calibration-due count in the "Good to see you" banner (Admin/Storekeeper only)
2. Dashboard reordered into 3 columns, no gap between related cards
3. New ATW logo (sidebar, login page, browser tab icon)
4. QR labels page restricted to Admin only
5. **New approval workflow**: Engineers and General Loan borrowers now *request* to borrow;
   a Storekeeper or Admin must Approve or Reject before the asset actually changes hands.
   A green "Approval List" button and a live pending-count tile appear on the dashboard
   for Admin/Storekeeper. Storekeeper/Admin themselves still check assets out directly —
   no approval needed for their own actions.
6. "Check in to [name]" → "Check in to Storekeeper" (generic wording)
7. Activity tab now defaults to showing **everyone's** activity for Admin and Storekeeper
   (they can still switch to "My activity")
8. "Send reminder" is now Storekeeper-only — **Admin deliberately does not see this button**.
   This is an intentional exception to "Admin can do everything." If that's not actually what
   you wanted, tell me and I'll give Admin access to it too (one-line change).
9. Demo accounts replaced with your 4 real accounts (see table below). **Temporary password
   for all four is `mira1234` — change it immediately after first login (Users page, or ask
   each person to use "reset password" once that's built).**

| Name | Email | Role |
|---|---|---|
| Ahmad Muzakki Setiawan | ahmad.setiawan@ATWSolar.com | Storekeeper |
| Muhamad Aries B. | muhamad.bahthiyar@ATWSolar.com | Management |
| Moch. Rafi Damas Abdilla | moch.abdilla@ATWSolar.com | Engineer |
| Engineering ATW | engineering@ATWSolar.com | Admin |

**One data note:** your original Excel import already had a Person named "Muzakki" (how the
storekeeper was recorded as asset holder in the old data). This update adds a *separate*
Person "Ahmad Muzakki Setiawan" — they won't conflict, but you'll see both names if you
browse the People list. Harmless; merge/rename later in Prisma Studio if you want one name only.

## Step 1 — Copy the files
Copy this zip's `backend` and `frontend` folders into your project folder (the one with
`setup.bat` / `docker-compose.prod.yml`), choosing **Replace** when asked. This adds the new
`backend/src/approvals/` folder and `frontend/src/pages/Approvals.tsx`, and overwrites the
other changed files listed above.

## Step 2 — Generate the migration (do this on your PC, not the VPS)
The database schema changed (new `BorrowRequest` table, new `ApprovalStatus` enum), so Prisma
needs a migration file that matches *your* migration history. I can't safely create this file
for you without access to your real database — Prisma generates it by comparing against your
existing migrations.

With your local dev database running (`docker compose -f docker-compose.dev.yml up -d`, or
however `setup.bat` set it up), run:

```bat
cd backend
npx prisma migrate dev --name add_rbac_approvals
```

This creates a new folder under `backend/prisma/migrations/` with the SQL for the new table.
Confirm it finished with something like `Your database is now in sync with your schema`.

## Step 3 — Commit and push
```bat
git add .
git commit -m "Add RBAC approvals, dashboard layout, new logo"
git push
```

## Step 4 — Deploy to the VPS
```bash
cd ~/mira
git pull
sudo docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
sudo docker compose -f docker-compose.prod.yml up -d --build
sudo docker compose -f docker-compose.prod.yml exec backend npm run seed
```
The seed step adds the 4 real accounts (safe to re-run — it only adds what's missing, see
`upsert` in seed.ts; it won't duplicate your existing 91 assets or touch real transaction history).

## Step 5 — Verify
- Log in as `engineering@ATWSolar.com` / `mira1234` (Admin) — confirm no "Send reminder" button,
  but Approvals/Users/Labels nav items are visible.
- Log in as `ahmad.setiawan@ATWSolar.com` / `mira1234` (Storekeeper) — confirm Approval List
  button + pending count on dashboard, and Send reminder works.
- Log in as `moch.abdilla@ATWSolar.com` / `mira1234` (Engineer) — confirm the button on an
  available asset says "Request to borrow", not "Check out".
- Test one full request → approve cycle end to end.

## If `migrate dev` conflicts or fails
If Prisma complains about drift or asks to reset, **do not reset** if you have real data —
paste me the exact error instead and I'll give you a manual fix.
