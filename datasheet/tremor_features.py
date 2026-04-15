"""
tremor_features.py
==================
Extracts ~95 tremor features from MPU6050 raw data.
Input : numpy array of shape (N, 6) → [ax, ay, az, gx, gy, gz]
Output: dict of features → feed directly into Random Forest
"""

import numpy as np
from scipy import stats
from scipy.signal import welch

try:
    import pywt
    PYWT_AVAILABLE = True
except ImportError:
    PYWT_AVAILABLE = False


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def bandpower(signal, fs, fmin, fmax):
    """Power in a frequency band using Welch's method."""
    nperseg = min(256, len(signal))
    freqs, psd = welch(signal, fs=fs, nperseg=nperseg)
    idx = np.logical_and(freqs >= fmin, freqs <= fmax)
    _trapz = getattr(np, "trapezoid", getattr(np, "trapz", None))
    return float(_trapz(psd[idx], freqs[idx]))


def dominant_frequency(signal, fs):
    """Return the frequency (Hz) with the most power."""
    nperseg = min(256, len(signal))
    freqs, psd = welch(signal, fs=fs, nperseg=nperseg)
    return float(freqs[np.argmax(psd)])


def spectral_entropy(signal, fs):
    """Normalized spectral entropy — high = chaotic (PTSD), low = rhythmic."""
    nperseg = min(256, len(signal))
    _, psd = welch(signal, fs=fs, nperseg=nperseg)
    psd_norm = psd / (psd.sum() + 1e-10)
    return float(-np.sum(psd_norm * np.log2(psd_norm + 1e-10)))


def harmonic_ratio(signal, fs):
    """Ratio of harmonic energy to total energy. High = Parkinson's."""
    nperseg = min(256, len(signal))
    freqs, psd = welch(signal, fs=fs, nperseg=nperseg)
    dom_f = freqs[np.argmax(psd)]
    if dom_f < 0.5:
        return 0.0
    harmonic_mask = np.zeros_like(freqs, dtype=bool)
    for k in range(1, 6):
        harmonic_freq = k * dom_f
        idx = np.argmin(np.abs(freqs - harmonic_freq))
        harmonic_mask[idx] = True
    harmonic_energy = psd[harmonic_mask].sum()
    total_energy = psd.sum() + 1e-10
    return float(harmonic_energy / total_energy)


def burst_features(magnitude, fs, threshold_multiplier=1.5):
    """Count and characterize tremor bursts above threshold."""
    threshold = magnitude.mean() + threshold_multiplier * magnitude.std()
    above = magnitude > threshold
    bursts, in_burst, start = [], False, 0
    for i, val in enumerate(above):
        if val and not in_burst:
            in_burst, start = True, i
        elif not val and in_burst:
            bursts.append(i - start)
            in_burst = False
    if in_burst:
        bursts.append(len(above) - start)

    if len(bursts) == 0:
        return 0, 0.0, 0.0, 0.0
    durations = np.array(bursts) / fs * 1000  # ms
    inter = np.diff([0] + [i for i, v in enumerate(above) if v]) if len(bursts) > 1 else np.array([0])
    return len(bursts), float(durations.mean()), float(durations.std()), float(inter.std())


# ─────────────────────────────────────────────
# MAIN EXTRACTOR
# ─────────────────────────────────────────────

def extract_tremor_features(window: np.ndarray, fs: int = 100) -> dict:
    """
    Parameters
    ----------
    window : np.ndarray, shape (N, 6)
        Columns: [ax, ay, az, gx, gy, gz]
        ax/ay/az in m/s²,  gx/gy/gz in °/s
    fs : int
        Sampling frequency in Hz (default 100)

    Returns
    -------
    dict of ~95 float features
    """
    ax, ay, az = window[:, 0], window[:, 1], window[:, 2]
    gx, gy, gz = window[:, 3], window[:, 4], window[:, 5]

    accel_mag = np.sqrt(ax**2 + ay**2 + az**2)
    gyro_mag  = np.sqrt(gx**2 + gy**2 + gz**2)

    feat = {}

    # ── 1. BASIC STATISTICAL ──────────────────────────────────────────
    for name, sig in [("accel_mag", accel_mag), ("gyro_mag", gyro_mag)]:
        feat[f"{name}_mean"]     = float(sig.mean())
        feat[f"{name}_median"]   = float(np.median(sig))
        feat[f"{name}_std"]      = float(sig.std())
        feat[f"{name}_variance"] = float(sig.var())
        feat[f"{name}_skew"]     = float(stats.skew(sig))
        feat[f"{name}_kurtosis"] = float(stats.kurtosis(sig))
        feat[f"{name}_peak2peak"]= float(sig.max() - sig.min())
        feat[f"{name}_rms"]      = float(np.sqrt(np.mean(sig**2)))
        feat[f"{name}_iqr"]      = float(np.percentile(sig, 75) - np.percentile(sig, 25))
        feat[f"{name}_mad"]      = float(np.mean(np.abs(sig - sig.mean())))
        feat[f"{name}_energy"]   = float(np.sum(sig**2))

    # ── 2. PER-AXIS STATS ────────────────────────────────────────────
    for name, sig in [("ax", ax), ("ay", ay), ("az", az),
                      ("gx", gx), ("gy", gy), ("gz", gz)]:
        feat[f"{name}_mean"] = float(sig.mean())
        feat[f"{name}_std"]  = float(sig.std())
        feat[f"{name}_max"]  = float(sig.max())

    # ── 3. AXIS CORRELATIONS ──────────────────────────────────────────
    feat["corr_ax_ay"] = float(np.corrcoef(ax, ay)[0, 1])
    feat["corr_ax_az"] = float(np.corrcoef(ax, az)[0, 1])
    feat["corr_ay_az"] = float(np.corrcoef(ay, az)[0, 1])
    feat["corr_gx_gy"] = float(np.corrcoef(gx, gy)[0, 1])
    feat["corr_gx_gz"] = float(np.corrcoef(gx, gz)[0, 1])

    # ── 4. MOTION DYNAMICS ───────────────────────────────────────────
    diff_mag  = np.diff(accel_mag)
    jerk      = np.abs(diff_mag) * fs   # m/s³

    feat["zero_crossing_rate"]  = float(((accel_mag[:-1] - accel_mag.mean()) *
                                          (accel_mag[1:]  - accel_mag.mean()) < 0).sum() / len(accel_mag))
    feat["slope_sign_changes"]  = float((np.diff(np.sign(diff_mag)) != 0).sum())
    feat["jerk_mean"]           = float(jerk.mean())
    feat["jerk_std"]            = float(jerk.std())
    feat["jerk_max"]            = float(jerk.max())
    feat["waveform_length"]     = float(np.sum(np.abs(diff_mag)))
    feat["impulse_factor"]      = float(accel_mag.max() / (feat["accel_mag_rms"] + 1e-10))
    feat["crest_factor"]        = float(accel_mag.max() / (feat["accel_mag_rms"] + 1e-10))
    feat["activity_index"]      = float(np.var([accel_mag[i:i+10].var()
                                                for i in range(0, len(accel_mag)-10, 10)]))

    # ── 5. BURST FEATURES ────────────────────────────────────────────
    b_count, b_dur_mean, b_dur_std, b_inter_std = burst_features(accel_mag, fs)
    feat["burst_count"]          = float(b_count)
    feat["burst_duration_mean"]  = b_dur_mean
    feat["burst_duration_std"]   = b_dur_std
    feat["inter_burst_std"]      = b_inter_std
    # onset sharpness = max slope in first 20 samples
    feat["onset_sharpness"]      = float(np.max(np.abs(np.diff(accel_mag[:20]))) if len(accel_mag) >= 20 else 0.0)
    feat["window_entropy"]       = float(stats.entropy(np.histogram(accel_mag, bins=20)[0] + 1e-10))

    # ── 6. FFT BAND POWERS ───────────────────────────────────────────
    bands = [(0,1),(1,2),(2,3),(3,4),(4,6),(6,8),(8,12),(12,20),(20,50)]
    for flo, fhi in bands:
        feat[f"bp_{flo}_{fhi}hz"] = bandpower(accel_mag, fs, flo, fhi)

    # ── 7. SPECTRAL SHAPE ────────────────────────────────────────────
    nperseg = min(256, len(accel_mag))
    freqs, psd = welch(accel_mag, fs=fs, nperseg=nperseg)
    psd_norm = psd / (psd.sum() + 1e-10)
    sorted_idx = np.argsort(psd)[::-1]

    feat["dominant_freq"]       = float(freqs[sorted_idx[0]])
    feat["secondary_peak_freq"] = float(freqs[sorted_idx[1]]) if len(sorted_idx) > 1 else 0.0
    feat["peak_power_ratio"]    = float(psd[sorted_idx[0]] / (psd.sum() + 1e-10))
    feat["spectral_centroid"]   = float(np.sum(freqs * psd_norm))
    feat["spectral_spread"]     = float(np.sqrt(np.sum(((freqs - feat["spectral_centroid"])**2) * psd_norm)))
    feat["spectral_entropy"]    = spectral_entropy(accel_mag, fs)
    feat["spectral_flatness"]   = float(stats.gmean(psd + 1e-10) / (psd.mean() + 1e-10))
    cumpow = np.cumsum(psd)
    rolloff_idx = np.searchsorted(cumpow, 0.85 * cumpow[-1])
    feat["spectral_rolloff"]    = float(freqs[rolloff_idx]) if rolloff_idx < len(freqs) else float(freqs[-1])
    feat["harmonic_ratio"]      = harmonic_ratio(accel_mag, fs)

    # ── 8. FREQUENCY STABILITY (simulated across sub-windows) ────────
    sub_size = max(64, len(accel_mag) // 5)
    dom_freqs = []
    for i in range(0, len(accel_mag) - sub_size, sub_size):
        dom_freqs.append(dominant_frequency(accel_mag[i:i+sub_size], fs))
    if len(dom_freqs) >= 2:
        feat["dominant_freq_std"]   = float(np.std(dom_freqs))
        feat["dominant_freq_range"] = float(np.max(dom_freqs) - np.min(dom_freqs))
        feat["peak_freq_drift"]     = float(np.mean(np.abs(np.diff(dom_freqs))))
    else:
        feat["dominant_freq_std"]   = 0.0
        feat["dominant_freq_range"] = 0.0
        feat["peak_freq_drift"]     = 0.0

    # spectral flux between first and last sub-window
    if len(accel_mag) >= 2 * sub_size:
        _, psd1 = welch(accel_mag[:sub_size],  fs=fs, nperseg=min(64, sub_size))
        _, psd2 = welch(accel_mag[-sub_size:], fs=fs, nperseg=min(64, sub_size))
        min_len = min(len(psd1), len(psd2))
        feat["spectral_flux"] = float(np.sum((psd2[:min_len] - psd1[:min_len])**2))
    else:
        feat["spectral_flux"] = 0.0

    # ── 9. WAVELET DOMAIN ────────────────────────────────────────────
    if PYWT_AVAILABLE:
        try:
            coeffs = pywt.wavedec(accel_mag, 'db4', level=5)
            for lvl, c in enumerate(coeffs[1:], start=1):
                e = float(np.sum(c**2) / (len(c) + 1e-10))
                ent_arr = c**2 / (np.sum(c**2) + 1e-10)
                ent = float(-np.sum(ent_arr * np.log2(ent_arr + 1e-10)))
                feat[f"wavelet_energy_L{lvl}"]  = e
                feat[f"wavelet_entropy_L{lvl}"] = ent
            # Key ratio: PTSD zone (L2) vs Parkinson's zone (L4)
            e2 = feat.get("wavelet_energy_L2", 1e-10)
            e4 = feat.get("wavelet_energy_L4", 1e-10)
            e5 = feat.get("wavelet_energy_L5", 1e-10)
            feat["wavelet_L2_L4_ratio"] = float(e2 / (e4 + 1e-10))
            feat["wavelet_L5_L2_ratio"] = float(e5 / (e2 + 1e-10))
        except Exception:
            for lvl in range(1, 6):
                feat[f"wavelet_energy_L{lvl}"]  = 0.0
                feat[f"wavelet_entropy_L{lvl}"] = 0.0
            feat["wavelet_L2_L4_ratio"] = 1.0
            feat["wavelet_L5_L2_ratio"] = 1.0
    else:
        for lvl in range(1, 6):
            feat[f"wavelet_energy_L{lvl}"]  = 0.0
            feat[f"wavelet_entropy_L{lvl}"] = 0.0
        feat["wavelet_L2_L4_ratio"] = 1.0
        feat["wavelet_L5_L2_ratio"] = 1.0

    return feat


# ─────────────────────────────────────────────
# QUICK TEST
# ─────────────────────────────────────────────
if __name__ == "__main__":
    rng = np.random.default_rng(42)
    fake_window = rng.normal(0, 0.5, (256, 6))
    features = extract_tremor_features(fake_window, fs=100)
    print(f"Total features extracted: {len(features)}")
    for k, v in list(features.items())[:10]:
        print(f"  {k:30s} = {v:.4f}")
    print("  ...")
