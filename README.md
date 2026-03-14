# ShuttlePro — Badminton Tournament Organizer

## Deploy to Vercel (3 steps)

1. **Install Vercel CLI** (if not already):
   ```
   npm i -g vercel
   ```

2. **Deploy** from the folder containing these files:
   ```
   vercel --prod
   ```
   - When prompted: "Set up and deploy" → Yes
   - Project name: `shuttlepro` (or any name)
   - Directory: `./` (current folder)

3. Done — Vercel gives you a live URL like `https://shuttlepro.vercel.app`

---

## OR deploy via Vercel Dashboard (no CLI)

1. Go to https://vercel.com/new
2. Choose "Import Third-Party Git Repository" OR drag-and-drop this folder
3. No build settings needed — it's a static site

---

## Login Credentials

| Role        | Username    | Password   |
|-------------|-------------|------------|
| Admin       | admin       | admin123   |
| Scorer      | scorer      | scorer123  |
| Super Admin | superadmin  | super123   |
| Public      | (no login)  |            |

Change passwords in **Super Admin → User Management** after first login.

---

## Files

- `index.html` — the full app (same as ShuttlePro.html)
- `vercel.json` — Vercel routing config
- `ShuttlePro_AppScript.gs` — paste this into Google Apps Script

## Google Sheets Setup

The Apps Script URL is already embedded in the HTML.
Super Admin → Sheets Integration → Test Connection to verify.
