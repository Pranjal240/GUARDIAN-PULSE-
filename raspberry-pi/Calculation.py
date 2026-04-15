import time, threading, numpy as np
from flask import Flask, render_template
from flask_socketio import SocketIO
import board, busio
import adafruit_mlx90614
import max30102  # MAX30102 library

app = Flask(__name__)
sio = SocketIO(app, cors_allowed_origins="*")

# --- Sensor init ---
i2c = busio.I2C(board.SCL, board.SDA)
mlx = adafruit_mlx90614.MLX90614(i2c)
mx  = max30102.MAX30102()  # uses smbus internally

# ECG buffer (from your existing ADS1115 reader)
ecg_buffer = []
rr_intervals = []

# --- Temperature ---
def read_temperature():
    return round(mlx.object_temperature, 1)  # celsius

# --- SpO2 + Heart Rate from MAX30102 ---
def read_spo2():
    red, ir = mx.read_sequential()
    # Simple ratio-of-ratios SpO2 estimation
    if len(red) < 50 or len(ir) < 50:
        return None, None
    red = np.array(red, dtype=float)
    ir  = np.array(ir,  dtype=float)
    ac_red = np.std(red);  dc_red = np.mean(red)
    ac_ir  = np.std(ir);   dc_ir  = np.mean(ir)
    R = (ac_red / dc_red) / (ac_ir / dc_ir)
    spo2 = 110 - 25 * R   # empirical formula
    spo2 = round(np.clip(spo2, 80, 100), 1)
    # Heart rate from IR peaks
    from scipy.signal import find_peaks
    peaks, _ = find_peaks(ir, distance=20)
    if len(peaks) > 1:
        fs = 100  # MAX30102 sample rate
        avg_rr = np.mean(np.diff(peaks)) / fs
        hr = round(60 / avg_rr)
    else:
        hr = None
    return spo2, hr

# --- Respiratory Rate (EDR from ECG) ---
def compute_resp_rate(ecg_signal, fs=500):
    from scipy.signal import find_peaks, butter, filtfilt
    peaks, _ = find_peaks(ecg_signal, distance=int(0.5*fs))
    if len(peaks) < 4:
        return None
    rr = np.diff(peaks) / fs        # R-R intervals in seconds
    # Interpolate to uniform grid
    t_rr = peaks[1:] / fs
    t_uniform = np.linspace(t_rr[0], t_rr[-1], len(t_rr)*4)
    rr_interp = np.interp(t_uniform, t_rr, rr)
    # Bandpass 0.1–0.5 Hz (6–30 breaths/min)
    b, a = butter(2, [0.1, 0.5], btype='band', fs=1/(t_uniform[1]-t_uniform[0]))
    filtered = filtfilt(b, a, rr_interp)
    fft = np.abs(np.fft.rfft(filtered))
    freqs = np.fft.rfftfreq(len(filtered), t_uniform[1]-t_uniform[0])
    mask = (freqs >= 0.1) & (freqs <= 0.5)
    dominant = freqs[mask][np.argmax(fft[mask])]
    return round(dominant * 60, 1)  # breaths per min

# --- Blood Pressure (PTT method) ---
def compute_bp_ptt(ecg_signal, ppg_signal, fs=500):
    from scipy.signal import find_peaks
    ecg_peaks, _ = find_peaks(ecg_signal, distance=int(0.5*fs))
    ppg_peaks, _ = find_peaks(ppg_signal, distance=int(0.5*fs))
    if len(ecg_peaks) < 2 or len(ppg_peaks) < 2:
        return None, None
    # Match nearest PPG peak after each ECG R-peak
    ptts = []
    for r in ecg_peaks:
        after = ppg_peaks[ppg_peaks > r]
        if len(after) > 0:
            ptts.append((after[0] - r) / fs * 1000)  # ms
    if not ptts:
        return None, None
    ptt = np.mean(ptts)
    # Calibration constants (adjust with cuff measurement)
    sbp = round(180 - 0.9 * ptt)
    dbp = round(100 - 0.5 * ptt)
    return np.clip(sbp, 80, 180), np.clip(dbp, 50, 120)

# --- Heart Rhythm Classification ---
def classify_rhythm(hr, rr_intervals):
    if hr is None:
        return "No signal"
    if hr < 60:
        return "Bradycardia"
    if hr > 100:
        return "Tachycardia"
    if len(rr_intervals) > 3:
        cv = np.std(rr_intervals) / np.mean(rr_intervals)
        if cv > 0.15:
            return "Irregular — check AFib"
    return "Normal sinus rhythm"

# --- Main streaming loop ---
def stream_vitals():
    while True:
        temp  = read_temperature()
        spo2, hr = read_spo2()

        # Pull latest ECG buffer (populated by your existing ECG reader thread)
        ecg = np.array(ecg_buffer[-2500:]) if len(ecg_buffer) > 500 else None

        rr   = compute_resp_rate(ecg) if ecg is not None else None
        sbp, dbp = compute_bp_ptt(ecg, []) if ecg is not None else (None, None)
        rhythm = classify_rhythm(hr, rr_intervals)

        sio.emit('vitals', {
            'spo2':      spo2,
            'heart_rate': hr,
            'temperature': temp,
            'resp_rate':  rr,
            'bp_systolic': sbp,
            'bp_diastolic': dbp,
            'rhythm':     rhythm,
            'ecg':        ecg_buffer[-500:] if ecg_buffer else []
        })
        time.sleep(2)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    threading.Thread(target=stream_vitals, daemon=True).start()
    sio.run(app, host='0.0.0.0', port=5000)