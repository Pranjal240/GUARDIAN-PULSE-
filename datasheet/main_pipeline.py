"""
main_pipeline.py
================
Main Guardian Pulse inference pipeline running on Raspberry Pi 4B.

What it does every 2.56 seconds:
  1. Collects 256 samples from MPU6050
  2. Extracts ~95 tremor features
  3. Runs Random Forest inference → tremor class + confidence
  4. Sets TREMOR_FLAG if PTSD tremor detected
  5. Checks 3-flag condition (TREMOR + ECG + GPS) → triggers crisis response
  6. Publishes all results to HiveMQ MQTT

Run:
  python main_pipeline.py

Prerequisites:
  1. Run generate_dataset.py to create tremor_dataset.csv
  2. Run train_model.py to create tremor_model.pkl
  3. Wire MPU6050 and ADS1115 to Pi
  4. Fill in HIVEMQ credentials in ecg_mqtt_publisher.py
"""

import time
import json
import pickle
import threading
import numpy as np
import paho.mqtt.client as mqtt

# Local modules
from tremor_features  import extract_tremor_features
from mpu6050_reader   import MPU6050

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
FS              = 100     # Hz
WIN_SIZE        = 256     # samples = 2.56 sec window
MODEL_PATH      = "tremor_model.pkl"
SELECTOR_PATH   = "selector.pkl"

# HiveMQ (same as ecg_mqtt_publisher.py)
HIVEMQ_HOST     = "YOUR_CLUSTER_ID.s1.eu.hivemq.cloud"
HIVEMQ_PORT     = 8883
HIVEMQ_USERNAME = "your_username"
HIVEMQ_PASSWORD = "your_password"

# MQTT Topics
TOPIC_TREMOR    = "guardian_pulse/tremor/prediction"
TOPIC_FLAGS     = "guardian_pulse/detection/flags"
TOPIC_CRISIS    = "guardian_pulse/detection/crisis"
TOPIC_STATUS    = "guardian_pulse/device/status"

# Class labels
CLASS_NAMES = {0: "Normal", 1: "Walking", 2: "Parkinsons", 3: "PTSD_Tremor"}

# Detection thresholds
PTSD_CLASS_ID         = 3
PTSD_CONFIDENCE_THRESH = 0.65    # must be >= 65% confident
HR_THRESHOLD_BPM      = 110     # ECG flag condition
STILLNESS_THRESHOLD_M = 3.0     # GPS stillness threshold (metres)
PERSIST_SECONDS       = 30      # all 3 flags must hold for 30 sec


# ─────────────────────────────────────────────
# SHARED STATE (thread-safe via locks)
# ─────────────────────────────────────────────

state = {
    "tremor_flag":     False,
    "tremor_class":    "Normal",
    "tremor_conf":     0.0,
    "ecg_flag":        False,    # updated by ECG subscriber thread
    "hr_bpm":          0.0,
    "gps_flag":        False,    # updated by GPS module (stub here)
    "flag_start_time": None,
    "crisis_active":   False,
}
state_lock = threading.Lock()


# ─────────────────────────────────────────────
# LOAD MODEL
# ─────────────────────────────────────────────

def load_model():
    with open(MODEL_PATH,   "rb") as f: model    = pickle.load(f)
    with open(SELECTOR_PATH,"rb") as f: selector = pickle.load(f)
    print(f"✅ Model loaded: {MODEL_PATH}")
    print(f"   Features used: {selector.get_support().sum()}")
    return model, selector


# ─────────────────────────────────────────────
# MQTT SETUP
# ─────────────────────────────────────────────

class PipelineMQTT:
    def __init__(self):
        self.client    = mqtt.Client(client_id="gp_pipeline", protocol=mqtt.MQTTv5)
        self.connected = False
        self.client.username_pw_set(HIVEMQ_USERNAME, HIVEMQ_PASSWORD)
        self.client.tls_set()
        self.client.on_connect    = self._on_connect
        self.client.on_message    = self._on_message
        self.client.will_set(TOPIC_STATUS,
                             json.dumps({"status": "offline"}), qos=1, retain=True)

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            self.connected = True
            # Subscribe to ECG heartrate topic from ecg_mqtt_publisher
            client.subscribe("guardian_pulse/ecg/heartrate", qos=1)
            print("✅ MQTT connected — subscribed to ECG heartrate")

    def _on_message(self, client, userdata, msg):
        """Handle incoming ECG heartrate messages to update ECG flag."""
        try:
            payload = json.loads(msg.payload.decode())
            hr      = payload.get("hr_bpm", 0)
            with state_lock:
                state["hr_bpm"]    = hr
                state["ecg_flag"]  = hr > HR_THRESHOLD_BPM
        except Exception as e:
            print(f"⚠ MQTT message parse error: {e}")

    def connect(self):
        self.client.connect(HIVEMQ_HOST, HIVEMQ_PORT, keepalive=60)
        self.client.loop_start()
        for _ in range(20):
            if self.connected: break
            time.sleep(0.5)

    def publish(self, topic, payload, qos=0):
        if self.connected:
            self.client.publish(topic, json.dumps(payload), qos=qos)

    def disconnect(self):
        self.client.loop_stop()
        self.client.disconnect()


# ─────────────────────────────────────────────
# GPS STUB (replace with real GPS module)
# ─────────────────────────────────────────────

def update_gps_flag():
    """
    Stub — replace with real GPS module reading.
    In production: read from gpsd or serial GPS module.
    Set state["gps_flag"] = True if movement < 3m over last 30 sec.
    """
    # For now: randomly simulate occasional stillness
    import random
    with state_lock:
        state["gps_flag"] = random.random() > 0.3   # 70% chance still in demo


# ─────────────────────────────────────────────
# 3-FLAG CRISIS DETECTION LOGIC
# ─────────────────────────────────────────────

def check_crisis_condition(mqtt_client: PipelineMQTT):
    """
    Crisis fires only when ALL 3 flags are True for >= PERSIST_SECONDS.
    """
    with state_lock:
        all_flags = (state["tremor_flag"] and
                     state["ecg_flag"]    and
                     state["gps_flag"])

        if all_flags:
            if state["flag_start_time"] is None:
                state["flag_start_time"] = time.time()
                print("⚠  All 3 flags raised — starting persistence timer...")

            elapsed = time.time() - state["flag_start_time"]
            print(f"   Flags持続: {elapsed:.1f}s / {PERSIST_SECONDS}s required")

            if elapsed >= PERSIST_SECONDS and not state["crisis_active"]:
                state["crisis_active"] = True
                crisis_payload = {
                    "ts":           time.time(),
                    "crisis":       True,
                    "tremor_class": state["tremor_class"],
                    "tremor_conf":  state["tremor_conf"],
                    "hr_bpm":       state["hr_bpm"],
                    "flags": {
                        "tremor": state["tremor_flag"],
                        "ecg":    state["ecg_flag"],
                        "gps":    state["gps_flag"],
                    },
                    "message": "PTSD crisis detected — activating response protocol"
                }
                mqtt_client.publish(TOPIC_CRISIS, crisis_payload, qos=2)
                print("\n🚨 CRISIS ALERT TRIGGERED — Published to MQTT\n")

        else:
            # Reset if any flag drops
            if state["flag_start_time"] is not None:
                print("   Flags reset — at least one condition cleared")
            state["flag_start_time"] = None
            state["crisis_active"]   = False


# ─────────────────────────────────────────────
# MAIN INFERENCE LOOP
# ─────────────────────────────────────────────

def run_pipeline():
    model, selector = load_model()
    mpu             = MPU6050()
    mqtt_client     = PipelineMQTT()
    mqtt_client.connect()

    window_num = 0
    print(f"\n{'='*55}")
    print(" Guardian Pulse — Real-Time Tremor Detection")
    print(f"{'='*55}")
    print(f" Window size : {WIN_SIZE} samples ({WIN_SIZE/FS:.2f} sec)")
    print(f" Sample rate : {FS} Hz")
    print(f" PTSD thresh : {PTSD_CONFIDENCE_THRESH*100:.0f}% confidence")
    print(f"{'='*55}\n")

    try:
        while True:
            window_num += 1
            t0 = time.time()

            # ── Step 1: Collect IMU window ───────────────────────
            print(f"[W{window_num:04d}] Collecting {WIN_SIZE} samples...")
            window = mpu.collect_window(n_samples=WIN_SIZE, fs=FS)

            # ── Step 2: Extract features ─────────────────────────
            features_dict = extract_tremor_features(window, fs=FS)
            feature_vals  = np.array(list(features_dict.values())).reshape(1, -1)

            # ── Step 3: Feature selection (match training) ────────
            feature_vals_sel = selector.transform(feature_vals)

            # ── Step 4: Predict ───────────────────────────────────
            pred_class  = int(model.predict(feature_vals_sel)[0])
            pred_proba  = model.predict_proba(feature_vals_sel)[0]
            confidence  = float(pred_proba[pred_class])
            class_name  = CLASS_NAMES[pred_class]

            # ── Step 5: Update tremor flag ────────────────────────
            is_ptsd     = (pred_class == PTSD_CLASS_ID and
                           confidence >= PTSD_CONFIDENCE_THRESH)

            with state_lock:
                state["tremor_flag"]  = is_ptsd
                state["tremor_class"] = class_name
                state["tremor_conf"]  = confidence

            # ── Step 6: Update GPS flag ───────────────────────────
            update_gps_flag()

            # ── Step 7: Check 3-flag condition ────────────────────
            check_crisis_condition(mqtt_client)

            # ── Step 8: Publish tremor prediction ─────────────────
            elapsed = time.time() - t0
            proba_dict = {CLASS_NAMES[i]: round(float(p), 3)
                          for i, p in enumerate(pred_proba)}

            tremor_payload = {
                "ts":           time.time(),
                "window":       window_num,
                "class":        class_name,
                "class_id":     pred_class,
                "confidence":   round(confidence, 3),
                "probabilities":proba_dict,
                "tremor_flag":  is_ptsd,
                "inference_ms": round(elapsed * 1000, 1),
                "features": {
                    "dominant_freq":     round(features_dict.get("dominant_freq", 0), 2),
                    "bp_8_12hz":         round(features_dict.get("bp_8_12hz", 0), 4),
                    "bp_4_6hz":          round(features_dict.get("bp_4_6hz", 0), 4),
                    "spectral_entropy":  round(features_dict.get("spectral_entropy", 0), 3),
                    "wavelet_L2_L4":     round(features_dict.get("wavelet_L2_L4_ratio", 0), 3),
                    "burst_count":       int(features_dict.get("burst_count", 0)),
                }
            }
            mqtt_client.publish(TOPIC_TREMOR, tremor_payload, qos=0)

            # Publish all 3 flags
            with state_lock:
                flags_payload = {
                    "ts":           time.time(),
                    "tremor_flag":  state["tremor_flag"],
                    "ecg_flag":     state["ecg_flag"],
                    "gps_flag":     state["gps_flag"],
                    "hr_bpm":       state["hr_bpm"],
                    "all_active":   (state["tremor_flag"] and
                                     state["ecg_flag"] and
                                     state["gps_flag"])
                }
            mqtt_client.publish(TOPIC_FLAGS, flags_payload, qos=0)

            # ── Console output ────────────────────────────────────
            flag_str = ("🚨 PTSD TREMOR" if is_ptsd else f"  {class_name}")
            print(f"[W{window_num:04d}] {flag_str:15s} | "
                  f"conf={confidence:.2f} | "
                  f"dom_f={features_dict.get('dominant_freq',0):.1f}Hz | "
                  f"ECG={state['ecg_flag']} HR={state['hr_bpm']:.0f} | "
                  f"{elapsed*1000:.0f}ms")

    except KeyboardInterrupt:
        print("\nPipeline stopped.")
    finally:
        mpu.close()
        mqtt_client.disconnect()


if __name__ == "__main__":
    run_pipeline()
