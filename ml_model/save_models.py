"""
ml_model/save_models.py
────────────────────────────────────────────────────────────────────
Run this ONCE after your Phase 5 notebook has trained the model.

It re-trains the same Random Forest from your CSV data and saves
rf_model.pkl + scaler.pkl into ml_model/models/

HOW TO RUN:
    cd ml_model
    python save_models.py

After it finishes you will see:
    models/rf_model.pkl   ← created
    models/scaler.pkl     ← created
"""

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

# ── Paths ────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# CSV is one level up, in Backend/data/ or in original outputs/
# Try both locations
CSV_PATHS = [
    os.path.join(BASE_DIR, "air_pollution_with_aqi.csv"),              # same folder ✓
    os.path.join(BASE_DIR, "..", "..", "outputs", "air_pollution_with_aqi.csv"),
    os.path.join(BASE_DIR, "..", "outputs", "air_pollution_with_aqi.csv"),
]

# ── Load air pollution CSV ────────────────────────────────────────────
csv_path = None
for p in CSV_PATHS:
    if os.path.exists(p) and p.endswith(".csv"):
        csv_path = p
        break

if csv_path is None:
    # Try to find it anywhere near this folder
    import glob
    found = glob.glob(os.path.join(BASE_DIR, "..", "**", "air_pollution_with_aqi.csv"), recursive=True)
    if found:
        csv_path = found[0]

if csv_path is None:
    print("❌  Could not find air_pollution_with_aqi.csv")
    print("    Copy it next to this file and run again.")
    exit(1)

print(f"✅  Loading data from: {csv_path}")
df = pd.read_csv(csv_path, low_memory=False)
df["city"]  = df["city"].str.strip()
df["state"] = df["state"].str.strip()
df["year"]  = df["year"].astype(int)
df["month"] = df["month"].astype(int)

PM_COL = "PM2.5 (ug/m3)_mean"
WEATHER_COLS = ["AT (degree C)_mean", "RH (%)_mean", "WS (m/s)_mean", "RF (mm)_mean"]

# ── Build training dataset ────────────────────────────────────────────
print("Building features...")
rows = []
for city, grp in df.groupby("city"):
    grp = grp.sort_values(["year", "month"]).reset_index(drop=True)
    pm_vals = grp[PM_COL].values

    for i in range(2, len(grp) - 1):
        lag1 = pm_vals[i]
        lag2 = pm_vals[i - 1]
        target = pm_vals[i + 1]

        if any(not isinstance(v, float) or np.isnan(v)
               for v in [lag1, lag2, target]):
            continue
        try:
            lag1 = float(lag1)
            lag2 = float(lag2)
            target = float(target)
            if np.isnan(lag1) or np.isnan(lag2) or np.isnan(target):
                continue
        except (TypeError, ValueError):
            continue

        row_data = grp.iloc[i]
        AT = float(row_data.get("AT (degree C)_mean", 25.0) or 25.0)
        RH = float(row_data.get("RH (%)_mean",        60.0) or 60.0)
        WS = float(row_data.get("WS (m/s)_mean",       2.0) or  2.0)
        RF = float(row_data.get("RF (mm)_mean",         0.0) or  0.0)

        yr  = int(row_data["year"])
        mo  = int(row_data["month"])
        m_sin = np.sin(2 * np.pi * mo / 12)
        m_cos = np.cos(2 * np.pi * mo / 12)

        rows.append([lag1, lag2, AT, RH, WS, RF, m_sin, m_cos, yr, target])

dataset = pd.DataFrame(rows, columns=[
    "PM25_lag1", "PM25_lag2",
    "AT (degree C)_mean", "RH (%)_mean", "WS (m/s)_mean", "RF (mm)_mean",
    "month_sin", "month_cos", "year",
    "target"
]).dropna()

print(f"   Dataset size: {len(dataset)} rows")

FEATURES = [
    "PM25_lag1", "PM25_lag2",
    "AT (degree C)_mean", "RH (%)_mean", "WS (m/s)_mean", "RF (mm)_mean",
    "month_sin", "month_cos", "year",
]

X = dataset[FEATURES].values
y = dataset["target"].values

# ── Train / test split by year (same as Phase 5) ─────────────────────
train_mask = dataset["year"] <= 2020
X_train, X_test = X[train_mask], X[~train_mask]
y_train, y_test = y[train_mask], y[~train_mask]

print(f"   Train: {len(X_train)} rows  |  Test: {len(X_test)} rows")

# ── Fit scaler ────────────────────────────────────────────────────────
scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc  = scaler.transform(X_test)

# ── Train Random Forest ───────────────────────────────────────────────
print("Training Random Forest (this takes ~30 seconds)...")
rf = RandomForestRegressor(
    n_estimators=100,
    random_state=42,
    n_jobs=-1,
)
rf.fit(X_train_sc, y_train)

# ── Evaluate ──────────────────────────────────────────────────────────
from sklearn.metrics import r2_score, mean_absolute_error
y_pred = rf.predict(X_test_sc)
r2  = round(r2_score(y_test, y_pred), 4)
mae = round(mean_absolute_error(y_test, y_pred), 2)
print(f"   Test R² = {r2}   |   Test MAE = {mae} μg/m³")

# ── Save ──────────────────────────────────────────────────────────────
rf_path  = os.path.join(MODELS_DIR, "rf_model.pkl")
sc_path  = os.path.join(MODELS_DIR, "scaler.pkl")

with open(rf_path, "wb") as f:
    pickle.dump(rf, f)
with open(sc_path, "wb") as f:
    pickle.dump(scaler, f)

print(f"\n✅  Saved: {rf_path}")
print(f"✅  Saved: {sc_path}")
print("\nYou can now start ml_service.py")
