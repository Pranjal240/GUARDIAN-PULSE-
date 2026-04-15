"""
train_model.py
==============
Trains Random Forest on tremor_dataset.csv and saves:
  - tremor_model.pkl     (trained model)
  - feature_list.pkl     (ordered feature names)
  - label_encoder.pkl    (class names)

Run once on PC or Pi:  python train_model.py
"""

import numpy as np
import pandas as pd
import pickle
import os

from sklearn.ensemble          import RandomForestClassifier
from sklearn.model_selection   import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing     import LabelEncoder
from sklearn.metrics           import classification_report, confusion_matrix
from sklearn.feature_selection import SelectFromModel


# ─────────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────────

def load_data(csv_path="tremor_dataset.csv"):
    if not os.path.exists(csv_path):
        print("Dataset not found. Generating now...")
        from generate_dataset import build_dataset
        build_dataset()

    df = pd.read_csv(csv_path)
    print(f"Loaded dataset: {df.shape}")
    print(f"Class distribution:\n{df['label_name'].value_counts()}\n")

    feature_cols = [c for c in df.columns if c not in ["label", "label_name"]]
    X = df[feature_cols].values
    y = df["label"].values

    return X, y, feature_cols


# ─────────────────────────────────────────────
# TRAIN
# ─────────────────────────────────────────────

def train(csv_path="tremor_dataset.csv"):
    X, y, feature_cols = load_data(csv_path)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # ── Step 1: Full model for feature selection ──────────────────────
    print("Training full model for feature selection...")
    rf_full = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features="sqrt",
        bootstrap=True,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42
    )
    rf_full.fit(X_train, y_train)

    # Feature importance
    importances = rf_full.feature_importances_
    importance_df = pd.DataFrame({
        "feature":    feature_cols,
        "importance": importances
    }).sort_values("importance", ascending=False)

    print("\nTop 20 Most Important Features:")
    print(importance_df.head(20).to_string(index=False))

    # ── Step 2: Select top features ──────────────────────────────────
    selector = SelectFromModel(rf_full, threshold="mean", prefit=True)
    X_train_sel = selector.transform(X_train)
    X_test_sel  = selector.transform(X_test)
    selected_features = [feature_cols[i] for i in selector.get_support(indices=True)]
    print(f"\nFeatures selected: {len(selected_features)} / {len(feature_cols)}")

    # ── Step 3: Final model on selected features ──────────────────────
    print("\nTraining final model on selected features...")
    rf_final = RandomForestClassifier(
        n_estimators=300,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features="sqrt",
        bootstrap=True,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42
    )
    rf_final.fit(X_train_sel, y_train)

    # ── Step 4: Evaluate ─────────────────────────────────────────────
    y_pred = rf_final.predict(X_test_sel)
    class_names = ["Normal", "Walking", "Parkinsons", "PTSD_Tremor"]

    print("\n" + "="*60)
    print("CLASSIFICATION REPORT")
    print("="*60)
    print(classification_report(y_test, y_pred, target_names=class_names))

    print("CONFUSION MATRIX")
    print("="*60)
    cm = confusion_matrix(y_test, y_pred)
    cm_df = pd.DataFrame(cm, index=class_names, columns=class_names)
    print(cm_df)

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(rf_final, X_train_sel, y_train, cv=cv, scoring="f1_macro")
    print(f"\nCross-Val F1 (5-fold): {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    # ── Step 5: Save artifacts ────────────────────────────────────────
    with open("tremor_model.pkl",   "wb") as f: pickle.dump(rf_final,          f)
    with open("feature_list.pkl",   "wb") as f: pickle.dump(selected_features, f)
    with open("selector.pkl",       "wb") as f: pickle.dump(selector,          f)
    with open("importance_df.pkl",  "wb") as f: pickle.dump(importance_df,     f)

    print("\n✅ Saved: tremor_model.pkl, feature_list.pkl, selector.pkl")
    return rf_final, selected_features, selector


if __name__ == "__main__":
    train()
