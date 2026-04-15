"""
ecg_mqtt_publisher.py
=====================
Reads ECG signal from BioAmp Heart Candy via ADS1115
and publishes to HiveMQ MQTT broker in real time.

Data Flow:
  BioAmp Heart Candy → ADS1115 (I2C) → Raspberry Pi 4B → HiveMQ Cloud

Wiring (ADS1115 → Pi):
  VDD  → 3.3V  (Pin 1)
  GND  → GND   (Pin 6)
  SCL  → GPIO3 (Pin 5)
  SDA  → GPIO2 (Pin 3)
  ADDR → GND   (I2C address 0x48)
  A0   → BioAmp OUT pin

Wiring (BioAmp Heart Candy → ADS1115):
  OUT  → A0 on ADS1115
  GND  → GND
  VCC  → 3.3V

Install:
  pip install adafruit-circuitpython-ads1x15 paho-mqtt

HiveMQ Cloud Setup:
  1. Create free account at https://www.hivemq.com/cloud/
  2. Create a cluster
  3. Create credentials (username + password)
  4. Fill in HIVEMQ_* constants below
"""

import time
import json
import threading
import numpy as np
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn
import paho.mqtt.client as mqtt

# ─────────────────────────────────────────────
# HIVEMQ CLOUD CONFIG — Fill these in
# ─────────────────────────────────────────────
HIVEMQ_HOST     = "YOUR_CLUSTER_ID.s1.eu.hivemq.cloud"  # from HiveMQ dashboard
HIVEMQ_PORT     = 8883                                    # TLS port
HIVEMQ_USERNAME = "your_username"
HIVEMQ_PASSWORD = "your_password"

# MQTT Topics
TOPIC_ECG_RAW        = "guardian_pulse/ecg/raw"          # raw voltage stream
TOPIC_ECG_BATCH      = "guardian_pulse/ecg/batch"        # batched 100-sample chunks
TOPIC_ECG_HEARTRATE  = "guardian_pulse/ecg/heartrate"    # computed HR in BPM
TOPIC_DEVICE_STATUS  = "guardian_pulse/device/status"    # online/offline

# ─────────────────────────────────────────────
# ADS1115 CONFIG
# ─────────────────────────────────────────────
SAMPLE_RATE         = 250    # Hz (ADS1115 max reliable = 250–860)
BATCH_SIZE          = 100    # samples per MQTT publish
GAIN                = 1      # ±4.096V range → good for BioAmp output
VOLTAGE_REFERENCE   = 3.3    # Pi 3.3V rail

# Pan-Tompkins simplified: HR detection window
HR_WINDOW_SEC       = 10     # compute HR every 10 seconds


# ─────────────────────────────────────────────
# PAN-TOMPKINS SIMPLIFIED R-PEAK DETECTOR
# ─────────────────────────────────────────────

def detect_r_peaks(signal: np.ndarray, fs: int = 250):
    """
    Simplified Pan-Tompkins R-peak detection.
    Returns list of R-peak indices and computed HR in BPM.
    """
    from scipy.signal import butter, filtfilt

    # 1. Bandpass filter 5–15 Hz
    b, a = butter(2, [5 / (fs/2), 15 / (fs/2)], btype='band')
    filtered = filtfilt(b, a, signal)

    # 2. Derivative
    deriv = np.diff(filtered)

    # 3. Square
    squared = deriv ** 2

    # 4. Moving average (150ms window)
    win = int(0.15 * fs)
    kernel = np.ones(win) / win
    integrated = np.convolve(squared, kernel, mode='same')

    # 5. Threshold and find peaks
    threshold = 0.5 * integrated.max()
    peaks = []
    refractory = int(0.2 * fs)   # 200ms refractory period
    last_peak  = -refractory

    for i in range(1, len(integrated) - 1):
        if (integrated[i] > threshold and
                integrated[i] > integrated[i-1] and
                integrated[i] > integrated[i+1] and
                i - last_peak > refractory):
            peaks.append(i)
            last_peak = i

    # 6. Compute HR
    if len(peaks) >= 2:
        rr_intervals = np.diff(peaks) / fs          # seconds
        hr_bpm       = 60.0 / np.mean(rr_intervals)
    else:
        hr_bpm = 0.0

    return peaks, hr_bpm


# ─────────────────────────────────────────────
# MQTT CLIENT SETUP
# ─────────────────────────────────────────────

class MQTTPublisher:
    def __init__(self):
        self.client    = mqtt.Client(client_id="guardian_pulse_pi", protocol=mqtt.MQTTv5)
        self.connected = False
        self._setup()

    def _setup(self):
        self.client.username_pw_set(HIVEMQ_USERNAME, HIVEMQ_PASSWORD)
        self.client.tls_set()   # TLS for port 8883

        self.client.on_connect    = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_publish    = self._on_publish

        # Last-will message — tells subscribers if Pi goes offline
        self.client.will_set(
            TOPIC_DEVICE_STATUS,
            payload=json.dumps({"status": "offline", "device": "raspberry_pi"}),
            qos=1,
            retain=True
        )

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            self.connected = True
            print(f"✅ Connected to HiveMQ: {HIVEMQ_HOST}")
            # Announce online
            client.publish(
                TOPIC_DEVICE_STATUS,
                json.dumps({"status": "online", "device": "raspberry_pi"}),
                qos=1, retain=True
            )
        else:
            print(f"❌ MQTT connection failed: rc={rc}")

    def _on_disconnect(self, client, userdata, rc, properties=None):
        self.connected = False
        print(f"⚠ Disconnected from MQTT: rc={rc}")

    def _on_publish(self, client, userdata, mid):
        pass  # Can log publish confirmations here if needed

    def connect(self):
        print(f"Connecting to {HIVEMQ_HOST}:{HIVEMQ_PORT}...")
        self.client.connect(HIVEMQ_HOST, HIVEMQ_PORT, keepalive=60)
        self.client.loop_start()
        timeout = 10
        while not self.connected and timeout > 0:
            time.sleep(0.5)
            timeout -= 0.5
        if not self.connected:
            raise ConnectionError("Could not connect to HiveMQ MQTT broker")

    def publish(self, topic: str, payload: dict, qos: int = 0):
        if self.connected:
            self.client.publish(topic, json.dumps(payload), qos=qos)

    def disconnect(self):
        self.client.publish(
            TOPIC_DEVICE_STATUS,
            json.dumps({"status": "offline", "device": "raspberry_pi"}),
            qos=1, retain=True
        )
        self.client.loop_stop()
        self.client.disconnect()


# ─────────────────────────────────────────────
# ADS1115 ECG READER
# ─────────────────────────────────────────────

class ECGReader:
    def __init__(self):
        i2c       = busio.I2C(board.SCL, board.SDA)
        ads       = ADS.ADS1115(i2c, address=0x48)
        ads.gain  = GAIN
        self.chan  = AnalogIn(ads, ADS.P0)   # A0 pin
        print("ADS1115 initialized — reading ECG from A0")

    def read_voltage(self) -> float:
        """Returns voltage in millivolts."""
        return self.chan.voltage * 1000.0   # V → mV

    def read_raw_value(self) -> int:
        """Returns raw 16-bit ADC value."""
        return self.chan.value


# ─────────────────────────────────────────────
# MAIN PUBLISHER LOOP
# ─────────────────────────────────────────────

def run_ecg_publisher():
    mqtt_pub = MQTTPublisher()
    mqtt_pub.connect()

    ecg_reader = ECGReader()

    interval       = 1.0 / SAMPLE_RATE
    batch_buffer   = []
    hr_buffer      = []
    sample_count   = 0
    hr_window_size = SAMPLE_RATE * HR_WINDOW_SEC

    print(f"\nStreaming ECG at {SAMPLE_RATE} Hz → HiveMQ")
    print(f"Topics: {TOPIC_ECG_RAW}, {TOPIC_ECG_BATCH}, {TOPIC_ECG_HEARTRATE}")
    print("Press Ctrl+C to stop\n")

    try:
        while True:
            t_start   = time.time()
            timestamp = time.time()
            voltage   = ecg_reader.read_voltage()
            raw_val   = ecg_reader.read_raw_value()

            # ── Publish raw sample ───────────────────────────────
            mqtt_pub.publish(
                TOPIC_ECG_RAW,
                {
                    "ts":      timestamp,
                    "mv":      round(voltage, 4),
                    "raw":     raw_val,
                    "sample":  sample_count
                },
                qos=0   # QoS 0 for high-freq stream (speed > reliability)
            )

            # ── Accumulate batch ─────────────────────────────────
            batch_buffer.append({"ts": timestamp, "mv": round(voltage, 4)})
            hr_buffer.append(voltage)
            sample_count += 1

            # ── Publish batch every BATCH_SIZE samples ───────────
            if len(batch_buffer) >= BATCH_SIZE:
                mqtt_pub.publish(
                    TOPIC_ECG_BATCH,
                    {
                        "batch_id":    sample_count // BATCH_SIZE,
                        "samples":     BATCH_SIZE,
                        "fs":          SAMPLE_RATE,
                        "data":        batch_buffer
                    },
                    qos=1   # QoS 1 for batch (at-least-once delivery)
                )
                batch_buffer = []
                print(f"  → Batch published | sample #{sample_count} | {voltage:.2f} mV")

            # ── Compute and publish HR every HR_WINDOW_SEC ───────
            if len(hr_buffer) >= hr_window_size:
                signal_arr  = np.array(hr_buffer[-hr_window_size:])
                peaks, hr   = detect_r_peaks(signal_arr, fs=SAMPLE_RATE)

                mqtt_pub.publish(
                    TOPIC_ECG_HEARTRATE,
                    {
                        "ts":        timestamp,
                        "hr_bpm":    round(hr, 1),
                        "r_peaks":   len(peaks),
                        "window_sec": HR_WINDOW_SEC,
                        "alert":     hr > 110    # flag for PTSD detection
                    },
                    qos=1
                )
                print(f"  ❤ HR = {hr:.1f} BPM | R-peaks detected = {len(peaks)}")
                hr_buffer = hr_buffer[-hr_window_size:]  # keep rolling

            # ── Maintain sample rate ─────────────────────────────
            elapsed = time.time() - t_start
            sleep_t = interval - elapsed
            if sleep_t > 0:
                time.sleep(sleep_t)

    except KeyboardInterrupt:
        print("\nStopping ECG publisher...")
    finally:
        mqtt_pub.disconnect()
        print("Disconnected from HiveMQ.")


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    run_ecg_publisher()
