# ShuttlePro — Badminton Tournament Organizer

## How secrets are handled

Firebase API keys are **injected at build time** via Vercel environment variables.
- `index.html` in this repo contains only placeholder values — safe to commit publicly
- `build.js` runs during Vercel deploy, replaces placeholders with real values from env vars
- The built file (`public/index.html`) is never committed — it's generated fresh each deploy

---

## Setup Guide

### Step 1 — Push to GitHub (safe — no secrets in the repo)

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/shuttlepro.git
git push -u origin main
```

The `.gitignore` excludes `public/` and `.env*` files — your secrets never touch Git.

---

### Step 2 — Connect to Vercel

1. Go to **vercel.com/new** → Import your GitHub repo
2. Framework Preset: **Other**
3. Build Command: `node build.js` ← Vercel reads this from vercel.json automatically
4. Output Directory: `public` ← also from vercel.json
5. **Do NOT click Deploy yet** — add env vars first (Step 3)

---

### Step 3 — Add Firebase env vars in Vercel

In Vercel → your project → **Settings → Environment Variables**, add these four:

| Variable Name          | Value (from Firebase Console)        |
|------------------------|--------------------------------------|
| `FIREBASE_API_KEY`     | `AIzaSyD-your-actual-key...`         |
| `FIREBASE_PROJECT_ID`  | `your-project-id`                    |
| `FIREBASE_APP_ID`      | `1:123456789:web:abcdef...`          |
| `FIREBASE_SENDER_ID`   | `123456789012`                       |

Set Environment to **Production, Preview, Development** for all four.

Then click **Deploy** (or trigger a redeploy from the Deployments tab).

---

### Step 4 — Firebase Firestore setup

1. **console.firebase.google.com** → Your project → Firestore Database → Create database → **Test mode**
2. **Indexes tab** → Add composite index:
   - Collection ID: `tournaments`
   - Fields: `ended` (Ascending) + `updatedAt` (Descending)
   - Query scope: Collection
3. Wait ~2 minutes for index to build

---

### Step 5 — Google Sheets (Apps Script)

The Apps Script URL is already in the HTML. To verify:
- Login as Super Admin → Integrations → **Test Connection**
- If it fails, redeploy the Apps Script (see `ShuttlePro_AppScript.gs`)

---

## Local development (without Vercel)

To test locally with real Firebase, create a `.env` file (never commit it):

```
FIREBASE_API_KEY=AIzaSyD...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_APP_ID=1:123...
FIREBASE_SENDER_ID=123456...
```

Then run:
```bash
node build.js        # generates public/index.html with your real config
npx serve public     # serves it at http://localhost:3000
```

Or just open `public/index.html` directly in a browser.

---

## Firestore Security Rules (after testing)

Switch from test mode to locked-down rules in Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tournaments/{tid} {
      allow read: if true;
      allow write: if true;
      match /{sub}/{doc} {
        allow read, write: if true;
      }
    }
    match /_ping/{doc} {
      allow read, write: if true;
    }
  }
}
```

For tighter security later, you can add Firebase Authentication and restrict writes to authenticated users.

---

## Login Credentials

| Role        | Username   | Password  |
|-------------|------------|-----------|
| Admin       | admin      | admin123  |
| Scorer      | scorer     | scorer123 |
| Super Admin | superadmin | super123  |
| Public      | —          | —         |

Change via **Super Admin → User Management**.

---

## Why Firebase API keys are not truly secret

Firebase API keys identify your project to Google's servers — they are not authentication credentials. They are safe to expose in the browser because:
- Access is controlled by **Firestore Security Rules** (server-side)
- Rate limiting and quotas are enforced by Firebase per-project
- Adding **Firebase App Check** later can restrict which domains can use your key

The env var approach is still best practice — it keeps your repo clean and makes it easy to rotate keys.
