# Sharing TheraPlay temporarily with Cloudflare Quick Tunnel (Windows)

Your laptop is the server. Your groupmates open a temporary `https://….trycloudflare.com`
link and use the app. **They use your local XAMPP database `theraplay_db`**: they see
the records you see, and what they change is changed in your real local data.

```
groupmate browser ──https──► Frontend tunnel ──► Vite on 127.0.0.1:5173
        │
        └─ the app calls ──https──► API tunnel ──► Laravel on 127.0.0.1:8000 ──► XAMPP MySQL theraplay_db
```

Two tunnels are needed because the frontend (Vite) and the API (Laravel) are two
separate servers. The API uses bearer tokens (no cookies, no CSRF cookie), so two
different origins work without any session/cookie setup.

## One-time setup

1. Install cloudflared (then open a NEW terminal):
   `winget install --id Cloudflare.cloudflared`
   (check with `cloudflared --version`)
2. Dependencies already installed as usual (`npm install` in the repo root,
   `composer install` in `backend\`).

## Option A: one script (recommended)

1. Start **XAMPP → MySQL** (the `theraplay_db` database must be running).
2. Close any `php artisan serve` / `npm run dev` / `composer run dev` you started
   earlier (ports 8000 and 5173 must be free).
3. In PowerShell, from the repo root:

```powershell
.\scripts\start-tunnel.ps1 -Preview
```

- Without `-Preview` it runs the Vite dev server (hot reload, but it serves your source
  files to visitors). `-Preview` builds the production app and serves that instead
  (also tests the Content Security Policy). Prefer `-Preview` when sharing.
- It starts both tunnels, opens two PowerShell windows (Laravel and the frontend) with
  the right settings, and prints **"Share this link with your groupmates: https://…"**.
  Copy that link. Press Enter in the first window to stop the tunnels.
- Only the frontend link is shared. The API link is used by the app itself.

## Option B: manual (four terminals, all PowerShell)

Start XAMPP MySQL first. Then:

| Terminal | Command |
| --- | --- |
| 1 | `cloudflared tunnel --url http://127.0.0.1:8000` → copy the `https://….trycloudflare.com` it prints = **API URL** |
| 2 | `cloudflared tunnel --url http://127.0.0.1:5173` → copy its URL = **FRONTEND URL** |
| 3 | `cd backend` then the commands below (backend) |
| 4 | In the repo root, the commands below (frontend) |

Terminal 3 (replace the two URLs; these only set variables for THIS window, `backend\.env` is not touched):

```powershell
cd backend\public
$env:APP_URL="https://API-URL"
$env:FRONTEND_URL="https://FRONTEND-URL"
$env:CORS_ALLOWED_ORIGINS="https://FRONTEND-URL,http://localhost:5173,http://127.0.0.1:5173"
$env:APP_DEBUG="false"
php -S 127.0.0.1:8000 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php
```

(Do not use `php artisan serve` here: it ignores variables set in the shell.)

Terminal 4:

```powershell
$env:VITE_API_URL="https://API-URL/api"
npm run build
npx vite preview --host 127.0.0.1 --port 5173 --strictPort
```

(or `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` for the dev server.)

Share **FRONTEND URL**. The links change every time a tunnel restarts, so repeat the
steps (or the script) for a new session.

## Normal local development is unchanged

`composer run dev`, `http://localhost:5173` and `http://127.0.0.1:8000` still work with no
tunnel: the tunnel settings above exist only as variables of the windows the script (or
you) open, not in any file. `vite.config.js` merely allows `*.trycloudflare.com` Host
headers, and Laravel trusts forwarded headers only from this machine (`127.0.0.1`).

## Which actions change the shared local database

Everyone using the link writes to YOUR database. These save or delete data: register
(creates a parent account and emails a code), log in/out (tokens), profile edits and
picture, child profiles (add/edit/delete), Mark as Completed / Undo, session journal
(add/edit/delete), site feedback, and everything an admin does (activities, archive,
delete, contacts, accounts, conditions). Nothing resets or cleans up automatically.
Take a database backup first if you want a restore point. An admin login gives full
control, so do not share admin credentials (the admin account and password are not in
the repository).

## Security notes

- Anyone with the frontend link can reach the app; login, roles, email verification
  limits, rate limits and ownership checks are unchanged. Only the tunnel ports are
  exposed: MySQL, phpMyAdmin and XAMPP are not.
- The script forces `APP_DEBUG=false` for the shared API, so visitors never see stack
  traces (your `.env` may have it `true` for normal development).
- CORS allows exactly the frontend tunnel URL plus localhost, never `*`, never credentials.
- Real emails (verification codes) still need your Gmail App Password in `backend\.env`
  as usual; if mail is not set up, new registrations cannot receive codes.
- The links are guessable by nobody but are not secret: stop the tunnels when done.

## Known limitations

- Quick Tunnel URLs are temporary, random, and change on every restart; no uptime promise.
- The PHP built-in server handles one request at a time on Windows, so many simultaneous
  users (and pictures loading) can feel slow. Your laptop must stay on and awake.
- If someone opens an old link after a restart they get an error until you share the new one.
- Activity pictures, PDF thumbnails and downloads use the API link (https) automatically;
  PDF thumbnails for newly uploaded PDFs need `npm install` in `backend\` as usual.

## Manual checks (nothing here was tested through a real tunnel by Claude)

1. Open the frontend link in your phone (mobile data) or an incognito window.
2. Log in as a parent; the Activities list loads and pictures/thumbnails show.
3. Open an activity, View and Download an attachment.
4. Mark as Completed, save a journal entry, then Undo.
5. Log out and log in again; refresh the page on `/activities` (it must not 404).
6. Log in as admin (in your own browser): the Dashboard and Activity Feedback load.
7. An unverified account can browse but cannot complete activities.
