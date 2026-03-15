# ShuttlePro — Badminton Tournament Organizer

## Two integrations, two purposes

| Integration | Purpose | When it syncs |
|---|---|---|
| **Firebase Firestore** | Cross-device real-time sync — courts, live scores, queue | Every score update, assignment, swap |
| **Google Apps Script** | Excel recording for organizer records | After each match, on tournament end |

---

## Step 1 — Deploy to Vercel

Only two files needed at root:
- `index.html`
- `vercel.json`

```
npm i -g vercel
vercel --prod
```
Or drag-and-drop to vercel.com/new (Framework: Other, build command: blank).

---

## Step 2 — Firebase Firestore Setup

1. Go to **console.firebase.google.com** → Create project (free Spark plan)
2. Click **Firestore Database** → Create database → **Start in test mode**
3. Click **Project Settings** → **Your Apps** → Add Web App → copy `firebaseConfig`
4. In Firestore → **Indexes** tab → Add composite index:
   - Collection: `tournaments`
   - Fields: `ended` (Ascending) + `updatedAt` (Descending)
   - Query scope: Collection
5. In ShuttlePro: login as **Super Admin** → **Super Admin tab** → **Integrations**
6. Paste `apiKey`, `projectId`, `appId`, `messagingSenderId` → click **Save & Connect**
7. Status bar turns green: **Firebase live — all devices synced**

### What Firebase stores
```
tournaments/
  {id}/
    name, category, created, numCourts
    levels       ← full bracket/match data (JSON)
    crossover    ← crossover stages (JSON)
    ended, endedAt
    live/
      courts     ← live court assignments + scores + queue
      crossover  ← live crossover state
      matches/   ← individual match scores
```

---

## Step 3 — Google Sheets / Apps Script (already configured)

The Apps Script URL is already embedded. To verify:
1. Login as **Super Admin** → **Integrations** tab → **Test Connection**

Apps Script writes to Google Sheets:
- `TournamentName_Setup` — players and brackets (on bracket generation)
- `TournamentName_Matches` — one row per finished match (live, after each game)
- `TournamentName_Standings` — final standings (on tournament end)
- `TournamentName_Crossover` — crossover results
- `TournamentHistory` — one row per ended tournament

---

## Login Credentials

| Role        | Username   | Password  |
|-------------|------------|-----------|
| Admin       | admin      | admin123  |
| Scorer      | scorer     | scorer123 |
| Super Admin | superadmin | super123  |
| Public      | —          | —         |

Change passwords via **Super Admin → User Management**.

---

## How devices connect in real-time

```
Admin device          Scorer device         Public device
(sets up tournament,  (enters live scores,  (views courts,
 manages courts,       fullscreen board)     standings,
 assigns matches)                            crossover)
       │                     │                    │
       └─────────────────────┴────────────────────┘
                             │
                    Firebase Firestore
                    (real-time sync)
                             │
                    Google Sheets
                    (Excel records)
```

- Admin creates tournament → Firestore stores it → Scorer/Public load it automatically
- Scorer taps score → Firestore updates courts doc → Public sees it within ~1 second
- Match ends → Apps Script writes to Excel sheet → permanent record saved

---

## Firestore Security (after testing)

Once working, switch from test mode to proper rules in Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tournaments/{tid} {
      allow read: if true;
      allow write: if true; // tighten with auth later
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
