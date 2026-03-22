# Vāyu — Deployment Guide

This project has three services:
- **Frontend** — static HTML/CSS/JS → deployed to **Vercel**
- **Backend** — Node.js Express API → deployed to **Render**
- **ML Service** — Python Flask model server → deployed to **Render**

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18 | https://nodejs.org |
| Python | ≥ 3.11 | https://python.org |
| Git | any | https://git-scm.com |
| Render account | free | https://render.com |
| Vercel account | free | https://vercel.com |

---

## Local Development — Running All Three Services

Open **three separate terminals**.

### Terminal 1 — ML Service (Python Flask)
```bash
cd ml_model
pip install -r requirements.txt
python ml_service.py
# → Starts on http://localhost:5001
# → Test: http://localhost:5001/health
```

### Terminal 2 — Backend (Node.js)
```bash
cd Backend
npm install
cp .env.example .env        # first time only
node server.js
# → Starts on http://localhost:5000
# → Test: http://localhost:5000/api/health
```

### Terminal 3 — Frontend (static file server)
```bash
cd FrontEnd
# Option A — VS Code Live Server (recommended, auto-reloads)
# Right-click index.html → "Open with Live Server"

# Option B — Python
python -m http.server 5500
# → Open http://localhost:5500
```

The frontend uses `http://localhost:5000/api` by default (set in `app.js`).
No config changes needed for local dev.

---

## Production Deployment

Follow these steps **in order**. The services depend on each other's URLs.

---

### Step 1 — Push to GitHub

Make sure your repository is pushed with all the new files:
```
render.yaml          ← project root
.env.example         ← project root
Backend/package.json ← updated (engines field added)
ml_model/requirements.txt  ← pinned versions
ml_model/ml_service.py     ← path bug fixed
FrontEnd/vercel.json       ← new
```

---

### Step 2 — Deploy ML Service to Render

1. Go to https://render.com → **New** → **Web Service**
2. Connect your GitHub repository
3. Render will detect `render.yaml` automatically and show both services
4. Deploy **vayu-ml-service** first

**Settings Render auto-reads from render.yaml:**
- Runtime: Python 3.11
- Build: `pip install -r requirements.txt && cp ../Backend/data/city_data.json ./city_data.json`
- Start: `python ml_service.py`

**After deploy completes:**
- Note the URL: `https://vayu-ml-service.onrender.com` (or whatever Render assigns)
- Test it: `https://vayu-ml-service.onrender.com/health`
- Expected: `{"status": "ok", "model_loaded": true, ...}`

**If model_loaded is false:** The `.pkl` files are missing. Run `save_models.py` locally (see ml_model/save_models.py), commit the generated `ml_model/models/rf_model.pkl` and `scaler.pkl`, and redeploy.

---

### Step 3 — Deploy Backend to Render

1. In Render dashboard, deploy **vayu-backend** (from the same render.yaml)
2. Set these **Environment Variables** in the Render dashboard:

| Variable | Value |
|---|---|
| `ML_SERVICE_URL` | URL from Step 2, e.g. `https://vayu-ml-service.onrender.com` |
| `FRONTEND_URL` | Leave blank for now — fill in after Step 4 |
| `NODE_ENV` | `production` |

**After deploy completes:**
- Note the URL: `https://vayu-backend-xxxx.onrender.com`
- Test: `https://vayu-backend-xxxx.onrender.com/api/health`
- Expected: `{"status": "ok", "message": "Vayu backend is running"}`

---

### Step 4 — Deploy Frontend to Vercel

**Before deploying**, update `FrontEnd/map.html`. Find this commented line (around line 128):
```html
<!-- <script>window.VAYU_API_BASE = "https://vayu-backend-8qij.onrender.com/api";</script> -->
```

Uncomment it and replace the URL with your real backend URL from Step 3:
```html
<script>window.VAYU_API_BASE = "https://vayu-backend-xxxx.onrender.com/api";</script>
```

Commit and push this change, then:

1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repository
3. Set **Root Directory** to `FrontEnd`
4. Framework Preset: **Other** (it's a static site)
5. Click **Deploy**

**After deploy completes:**
- Note the URL: `https://vayu-xxxx.vercel.app`
- Test: open the URL, the map should load and show AQI data

---

### Step 5 — Connect Frontend → Backend (CORS)

Go back to **Render → vayu-backend → Environment**:

Set `FRONTEND_URL` to your Vercel URL:
```
FRONTEND_URL=https://vayu-xxxx.vercel.app
```

Click **Save** — Render will redeploy automatically.

This unlocks CORS so the frontend can call the backend API from the Vercel domain.

---

### Step 6 — Verify Everything End-to-End

Run these checks in order:

```
✅ ML Service health:    https://vayu-ml-service.onrender.com/health
✅ Backend health:       https://vayu-backend-xxxx.onrender.com/api/health
✅ Past data API:        https://vayu-backend-xxxx.onrender.com/api/past/city/Delhi
✅ Present (live AQI):   https://vayu-backend-xxxx.onrender.com/api/present/city/Delhi
✅ ML forecast:          https://vayu-backend-xxxx.onrender.com/api/future/city/Delhi
✅ Frontend loads:       https://vayu-xxxx.vercel.app
✅ Frontend map works:   Open map, click a city, check popups show real data
```

---

## Common Errors and Fixes

### "CORS error" in browser console
- `FRONTEND_URL` is not set in Render backend env vars, or it doesn't exactly match your Vercel URL (including `https://`)
- Fix: Go to Render → vayu-backend → Environment → set `FRONTEND_URL` exactly

### ML service returns `{"model_loaded": false}`
- The `.pkl` model files are not in `ml_model/models/`
- Fix: Run `python ml_model/save_models.py` locally, commit `ml_model/models/rf_model.pkl` and `ml_model/models/scaler.pkl`, push and redeploy
- Note: `.pkl` files are large (~11MB) — make sure they are NOT in `.gitignore`

### "City not found" from ML service
- `city_data.json` didn't copy correctly during Render build
- Fix: In Render → vayu-ml-service → Environment, set `CITY_DATA_PATH` to `/opt/render/project/src/ml_model/city_data.json` and redeploy

### Render services are slow to respond (first request)
- Free tier Render services spin down after 15 minutes of inactivity (cold start takes ~30 seconds)
- The backend already shows a friendly message: "ML service is waking up — try again in ~30 seconds"
- Upgrade to Render Starter ($7/month) to eliminate cold starts

### Frontend shows "API unavailable" or empty map
- Check browser console for the actual error
- Usually: `VAYU_API_BASE` not set in `map.html`, pointing to wrong backend URL
- Fix: Update `map.html`, uncomment and correct the `window.VAYU_API_BASE` line, redeploy to Vercel

### Vercel build fails
- Make sure **Root Directory** is set to `FrontEnd` in Vercel project settings
- The `vercel.json` must be inside the `FrontEnd/` folder, not the project root

---

## File Placement Summary

```
Pollution_Project/          ← GitHub repo root
├── render.yaml             ← Render reads this automatically
├── .env.example            ← Copy to .env for local dev
├── Backend/
│   ├── package.json        ← engines: node >=18 added
│   ├── server.js           ← no changes needed
│   └── data/
│       ├── city_data.json  ← used by both Backend and ML service
│       └── corr_data.json
├── ml_model/
│   ├── ml_service.py       ← path bug fixed
│   ├── requirements.txt    ← versions pinned
│   └── models/
│       ├── rf_model.pkl    ← must be committed to git
│       └── scaler.pkl      ← must be committed to git
└── FrontEnd/
    ├── vercel.json         ← new, Vercel reads this
    ├── map.html            ← set window.VAYU_API_BASE here
    ├── index.html
    ├── research.html
    ├── js/
    │   ├── app.js          ← reads window.VAYU_API_BASE
    │   └── ...
    └── styles/
```
