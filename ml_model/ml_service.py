"""
ml_model/ml_service.py
──────────────────────────────────────────────────────────────────────
A tiny Flask server that loads the trained Random Forest model once
and answers prediction requests from the Node.js backend.

Structure :
    ml_model/
        models/
            rf_model.pkl      ← saved from Phase 5 notebook
            scaler.pkl        ← saved from Phase 5 notebook
        ml_service.py         
        requirements.txt

How to run:
    cd ml_model
    pip install -r requirements.txt
    python ml_service.py
    → Starts on http://localhost:5001

How Node.js calls this:
    Node backend (port 5000)
        GET /api/future/city/Delhi
            → calls http://localhost:5001/predict?city=Delhi
            ← gets JSON forecast back
            → forwards to frontend
"""

import math
import pickle
import os
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
load_dotenv() 

app = Flask(__name__)
CORS(app)

# ── Paths ───
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# CSV data lives one level up in Backend/data/
# city_data.json lives in Backend/data/ — try multiple paths so it works
# both locally (../Backend/data/) and on Render (copied into ml_model/ by buildCommand)
_data_candidates = [
    os.environ.get("CITY_DATA_PATH", ""),                              # env override
    os.path.join(BASE_DIR, "city_data.json"),                          # copied into ml_model/
    os.path.join(BASE_DIR, "..", "Backend", "data", "city_data.json"), # local dev
    os.path.join(BASE_DIR, "..", "data", "city_data.json"),
]
AQI_CSV = next((p for p in _data_candidates if p and os.path.exists(p)), None)

# ── Load model + scaler at startup ──
rf_model = None
scaler   = None

def load_models():
    global rf_model, scaler
    rf_path  = os.path.join(MODELS_DIR, "rf_model.pkl")
    sc_path  = os.path.join(MODELS_DIR, "scaler.pkl")

    if os.path.exists(rf_path) and os.path.exists(sc_path):
        with open(rf_path, "rb") as f:
            rf_model = pickle.load(f)
        with open(sc_path, "rb") as f:
            scaler = pickle.load(f)
        print("✅  rf_model.pkl + scaler.pkl loaded")
    else:
        print("⚠️   Model files not found in ml_model/models/")
        print("    Run the Phase 5 notebook and save the models first.")

# ── Load AQI data for building lag features ──────────────────────────
import json
city_data = {}
if AQI_CSV is None:
    print("⚠️   city_data.json not found. Set CITY_DATA_PATH env var or copy it to ml_model/")
else:
    try:
        with open(AQI_CSV) as f:
            city_data = json.load(f)
        print(f"✅  City data loaded: {len(city_data)} cities from {AQI_CSV}")
    except Exception as e:
        print(f"⚠️   Could not load city data: {e}")

# ── Feature columns — must match Phase 5 training order exactly ──────
FEATURE_COLS = [
    "PM25_lag1",
    "PM25_lag2",
    "AT (degree C)_mean",
    "RH (%)_mean",
    "WS (m/s)_mean",
    "RF (mm)_mean",
    "month_sin",
    "month_cos",
    "year",
]

MODEL_MAE = 16.04
MODEL_R2  = 0.5943

MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun",
               "Jul","Aug","Sep","Oct","Nov","Dec"]

# ── AQI category from PM2.5 ──────────────────────────────────────────
def pm25_to_category(pm25):
    if pm25 is None: return "Unknown"
    # CPCB PM2.5 breakpoints → AQI sub-index → category
    breakpoints = [
        (0,30,0,50),(31,60,51,100),(61,90,101,200),
        (91,120,201,300),(121,250,301,400),(251,500,401,500)
    ]
    for c_lo,c_hi,i_lo,i_hi in breakpoints:
        if c_lo <= pm25 <= c_hi:
            aqi = round(((i_hi-i_lo)/(c_hi-c_lo))*(pm25-c_lo)+i_lo)
            if aqi <= 50:  return "Good"
            if aqi <= 100: return "Satisfactory"
            if aqi <= 200: return "Moderate"
            if aqi <= 300: return "Poor"
            if aqi <= 400: return "Very Poor"
            return "Severe"
    return "Severe"

def category_to_colour(cat):
    colours = {
        "Good":"#a8e063","Satisfactory":"#fdd835","Moderate":"#ff7c00",
        "Poor":"#f50057","Very Poor":"#9c27b0","Severe":"#6a0080","Unknown":"#607d8b"
    }
    return colours.get(cat, "#607d8b")

def advance_month(year, month):
    return (year+1, 1) if month == 12 else (year, month+1)

# ════════════════════════════════════════════════════════════════════
# GET /predict?city=Delhi&months=3
# Called by Node.js backend whenever frontend requests a forecast
# ════════════════════════════════════════════════════════════════════
@app.route("/predict")
def predict():
    city = request.args.get("city", "").strip()
    months_ahead = min(int(request.args.get("months", 3)), 3)

    # ── 1. Check model is loaded ────────────────────────────────────
    if rf_model is None or scaler is None:
        return jsonify({
            "error": "Model not loaded. Save rf_model.pkl and scaler.pkl to ml_model/models/ then restart."
        }), 503

    # ── 2. Find city in data ────────────────────────────────────────
    key = next((k for k in city_data if k.lower() == city.lower()), None)
    if not key:
        return jsonify({"error": f"City '{city}' not found in dataset."}), 404

    rows = sorted(city_data[key], key=lambda r: (r["year"], r["month"]), reverse=True)
    if len(rows) < 2:
        return jsonify({"error": f"Not enough data for '{city}' (need at least 2 months)."}), 422

    # ── 3. Extract lag features from last 2 rows ────────────────────
    lag1 = rows[0].get("pm25")
    lag2 = rows[1].get("pm25")
    if lag1 is None or lag2 is None:
        return jsonify({"error": f"Missing PM2.5 values for '{city}'."}), 422

    # Weather defaults (most cities don't have weather in our JSON)
    AT = 25.0
    RH = 60.0
    WS = 2.0
    RF = 0.0

    cur_year  = rows[0]["year"]
    cur_month = rows[0]["month"]

    # ── 4. Rolling 3-month forecast ─────────────────────────────────
    forecasts = []
    for _ in range(months_ahead):
        tgt_year, tgt_month = advance_month(cur_year, cur_month)

        month_sin = math.sin(2 * math.pi * tgt_month / 12)
        month_cos = math.cos(2 * math.pi * tgt_month / 12)

        # Build feature vector — SAME ORDER as Phase 5 training
        X_raw = np.array([[lag1, lag2, AT, RH, WS, RF,
                           month_sin, month_cos, tgt_year]])

        # Scale → predict
        X_scaled = scaler.transform(X_raw)
        pred = float(rf_model.predict(X_scaled)[0])
        pred = max(0.0, round(pred, 2))

        cat    = pm25_to_category(pred)
        colour = category_to_colour(cat)

        forecasts.append({
            "target_year":     tgt_year,
            "target_month":    tgt_month,
            "month_label":     f"{tgt_year}-{MONTH_NAMES[tgt_month]}",
            "predicted_pm25":  pred,
            "confidence_low":  max(0.0, round(pred - MODEL_MAE, 2)),
            "confidence_high": round(pred + MODEL_MAE, 2),
            "aqi_category":    cat,
            "colour":          colour,
        })

        # Feed this prediction as the next lag1
        lag2, lag1 = lag1, pred
        cur_year, cur_month = tgt_year, tgt_month

    return jsonify({
        "city": key,
        "forecasts": forecasts,
        "model_badge": {
            "r2":  MODEL_R2,
            "mae": MODEL_MAE,
            "description": f"Random Forest · R²={MODEL_R2} · MAE=±{MODEL_MAE} μg/m³"
        }
    })

# ── Health check ─────────────────────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "model_loaded":  rf_model is not None,
        "scaler_loaded": scaler is not None,
        "cities_loaded": len(city_data),
    })

# ── Entry point ──────────────────────────────────────────────────────
if __name__ == "__main__":
    load_models()
    # Read PORT from environment — Render injects this automatically
    port = int(os.environ.get("PORT", 5001))
    print(f"✅  ML service running on port {port}")
    print(f"    Health: http://localhost:{port}/health")
    print(f"    Test:   http://localhost:{port}/predict?city=Delhi")
    app.run(host="0.0.0.0", port=port, debug=False)