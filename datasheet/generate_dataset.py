"""
generate_dataset.py
===================
Generates a realistic fake tremor dataset with 4 classes:
  0 = Normal / Still
  1 = Walking
  2 = Parkinson's Tremor
  3 = PTSD / Stress Tremor

Output: tremor_dataset.csv  (features + label)
"""

import numpy as np
import pandas as pd
from tremor_features import extract_tremor_features

FS       = 100      # Hz
WIN_SIZE = 256      # samples per window = 2.56 sec
N_EACH   = 300      # samples per class → 1200 total
SEED     = 42

rng = np.random.default_rng(SEED)


# ─────────────────────────────────────────────
# SIGNAL GENERATORS
# ─────────────────────────────────────────────

def _t():
    return np.linspace(0, WIN_SIZE / FS, WIN_SIZE)


def generate_normal(n):
    """Very low random motion — person sitting still."""
    windows = []
    for _ in range(n):
        t = _t()
        noise = rng.normal(0, 0.05, (WIN_SIZE, 6))
        # small gravity component on z-axis
        noise[:, 2] += 9.81 + rng.normal(0, 0.02, WIN_SIZE)
        windows.append(noise)
    return windows


def generate_walking(n):
    """Rhythmic 2 Hz vertical bounce + slight lateral sway."""
    windows = []
    for _ in range(n):
        t = _t()
        step_freq  = rng.uniform(1.8, 2.2)    # ~2 Hz walk cadence
        amplitude  = rng.uniform(0.8, 1.5)

        ax = rng.normal(0, 0.1, WIN_SIZE)
        ay = amplitude * np.sin(2 * np.pi * step_freq * t) + rng.normal(0, 0.1, WIN_SIZE)
        az = 9.81 + amplitude * 0.5 * np.cos(2 * np.pi * step_freq * t) + rng.normal(0, 0.1, WIN_SIZE)
        gx = rng.normal(0, 2, WIN_SIZE)
        gy = 15 * np.sin(2 * np.pi * step_freq * t) + rng.normal(0, 1, WIN_SIZE)
        gz = rng.normal(0, 2, WIN_SIZE)

        windows.append(np.column_stack([ax, ay, az, gx, gy, gz]))
    return windows


def generate_parkinsons(n):
    """Slow rhythmic resting tremor 4–6 Hz, consistent amplitude, highly regular."""
    windows = []
    for _ in range(n):
        t = _t()
        tremor_freq = rng.uniform(4.0, 6.0)
        amplitude   = rng.uniform(0.5, 1.2)

        # Very regular — low noise
        ax = amplitude * np.sin(2 * np.pi * tremor_freq * t) + rng.normal(0, 0.05, WIN_SIZE)
        ay = amplitude * np.cos(2 * np.pi * tremor_freq * t) + rng.normal(0, 0.05, WIN_SIZE)
        az = 9.81 + rng.normal(0, 0.05, WIN_SIZE)
        gx = 20 * np.sin(2 * np.pi * tremor_freq * t) + rng.normal(0, 1, WIN_SIZE)
        gy = 20 * np.cos(2 * np.pi * tremor_freq * t) + rng.normal(0, 1, WIN_SIZE)
        gz = rng.normal(0, 1, WIN_SIZE)

        windows.append(np.column_stack([ax, ay, az, gx, gy, gz]))
    return windows


def generate_ptsd_tremor(n):
    """
    High-frequency (8–20 Hz), IRREGULAR, burst-like stress tremor.
    Multi-axis, chaotic, low harmonic structure.
    """
    windows = []
    for _ in range(n):
        t = _t()
        signal = np.zeros((WIN_SIZE, 6))

        # Base noise
        signal += rng.normal(0, 0.1, (WIN_SIZE, 6))
        signal[:, 2] += 9.81   # gravity

        # Add multiple irregular burst components
        n_bursts = rng.integers(3, 8)
        for _ in range(n_bursts):
            burst_freq  = rng.uniform(8.0, 20.0)     # PTSD zone
            burst_amp   = rng.uniform(0.3, 1.8)
            burst_start = rng.integers(0, WIN_SIZE - 30)
            burst_len   = rng.integers(15, 50)
            burst_end   = min(burst_start + burst_len, WIN_SIZE)
            phase       = rng.uniform(0, 2 * np.pi)

            burst_t = t[burst_start:burst_end]
            burst   = burst_amp * np.sin(2 * np.pi * burst_freq * burst_t + phase)
            # Random axis mix — chaotic, multi-directional
            ax_mix = rng.uniform(0.3, 1.0)
            ay_mix = rng.uniform(0.3, 1.0)
            az_mix = rng.uniform(0.1, 0.5)
            signal[burst_start:burst_end, 0] += ax_mix * burst
            signal[burst_start:burst_end, 1] += ay_mix * burst
            signal[burst_start:burst_end, 2] += az_mix * burst
            signal[burst_start:burst_end, 3] += 30 * ax_mix * burst
            signal[burst_start:burst_end, 4] += 30 * ay_mix * burst

        windows.append(signal)
    return windows


# ─────────────────────────────────────────────
# BUILD DATASET
# ─────────────────────────────────────────────

def build_dataset():
    print("Generating signals...")
    generators = [
        (generate_normal,      0, "Normal"),
        (generate_walking,     1, "Walking"),
        (generate_parkinsons,  2, "Parkinsons"),
        (generate_ptsd_tremor, 3, "PTSD_Tremor"),
    ]

    all_rows = []

    for gen_fn, label, label_name in generators:
        print(f"  → {label_name} ({N_EACH} samples)...")
        windows = gen_fn(N_EACH)
        for i, w in enumerate(windows):
            try:
                feats = extract_tremor_features(w, fs=FS)
                feats["label"]      = label
                feats["label_name"] = label_name
                all_rows.append(feats)
            except Exception as e:
                print(f"    ⚠ Skipped sample {i}: {e}")

    df = pd.DataFrame(all_rows)

    # Replace any NaN / inf
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.fillna(0, inplace=True)

    out_path = "tremor_dataset.csv"
    df.to_csv(out_path, index=False)
    print(f"\n✅ Dataset saved: {out_path}")
    print(f"   Shape  : {df.shape}")
    print(f"   Classes: {df['label_name'].value_counts().to_dict()}")
    return df


if __name__ == "__main__":
    build_dataset()
