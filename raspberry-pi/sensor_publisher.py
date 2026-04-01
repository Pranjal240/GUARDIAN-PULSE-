"""
Guardian Pulse — Raspberry Pi Sensor Publisher
Reads ECG via AD8232+ADS1115, motion via MPU6050.
Publishes to HiveMQ (live chart) + Cloudflare Worker (analysis+storage).
"""

import os, time, json, threading, ssl, requests
import board, busio
from adafruit_ads1x15.ads1115 import ADS1115
from adafruit_ads1x15.analog_in import AnalogIn
import paho.mqtt.client as mqtt

try:
    import adafruit_mpu6050
    HAS_MPU = True
except ImportError:
    HAS_MPU = False

# ── Config ───────────────────────────────────────────────────────
BROKER         = os.getenv("GP_MQTT_HOST", "<MQTT_HOST>")
PORT           = int(os.getenv("GP_MQTT_PORT", "8883"))
USERNAME       = os.getenv("GP_MQTT_USER", "<MQTT_USER>")
PASSWORD       = os.getenv("GP_MQTT_PASS", "<MQTT_PASS>")
TOPIC_ECG      = "guardianpulse/ecg"
TOPIC_MOTION   = "guardianpulse/motion"
CLOUDFLARE_URL = os.getenv("GP_CF_URL", "<CLOUDFLARE_SENSOR_URL>")
PI_SECRET      = os.getenv("GP_PI_SECRET", "<PI_SECRET>")
USER_ID        = os.getenv("GP_USER_ID", "<PI_USER_ID>")

# ── Sensors ──────────────────────────────────────────────────────
i2c     = busio.I2C(board.SCL, board.SDA)
ads     = ADS1115(i2c)
ecg_pin = AnalogIn(ads, 0)

mpu = None
if HAS_MPU:
    try:
        mpu = adafruit_mpu6050.MPU6050(i2c)
        print("✅ MPU6050 detected")
    except Exception:
        print("⚠️  MPU6050 not found — motion disabled")

# ── BPM Detection ────────────────────────────────────────────────
peak_times  = []
last_value  = 0.0
ascending   = False
current_bpm = 0

def detect_bpm(value, timestamp):
    global last_value, ascending, peak_times, current_bpm
    if ascending and value < last_value and last_value > 15000:
        if not peak_times or (timestamp - peak_times[-1]) > 0.3:
            peak_times.append(timestamp)
            if len(peak_times) > 8:
                peak_times.pop(0)
            if len(peak_times) >= 2:
                intervals = [peak_times[i] - peak_times[i-1] for i in range(1, len(peak_times))]
                avg = sum(intervals) / len(intervals)
                current_bpm = round(60 / avg) if avg > 0 else 0
    ascending  = value > last_value
    last_value = value

# ── Cloudflare POST ──────────────────────────────────────────────
def post_to_cloudflare(payload_dict):
    headers = {"Content-Type": "application/json", "X-Pi-Secret": PI_SECRET}
    for attempt in range(3):
        try:
            resp = requests.post(CLOUDFLARE_URL, headers=headers, json=payload_dict, timeout=5)
            if resp.status_code == 200:
                anomaly = resp.json().get("analysis", {}).get("anomalyType", "normal")
                print(f"  ☁️  CF OK: {anomaly}")
                return
            else:
                print(f"  ☁️  CF error: {resp.status_code} (try {attempt+1})")
        except Exception as e:
            print(f"  ☁️  CF fail (try {attempt+1}): {e}")
        if attempt < 2:
            time.sleep(1)

# ── MQTT Callbacks (DEFINED BEFORE USE) ─────────────────────────
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ MQTT connected to HiveMQ! (RC=0)")
    else:
        print(f"❌ MQTT failed: rc={rc}")

def on_disconnect(client, userdata, rc):
    print(f"⚠️  MQTT disconnected (rc={rc}), retrying...")

# ── MQTT Client Setup ────────────────────────────────────────────
mqtt_client = mqtt.Client()
mqtt_client.username_pw_set(USERNAME, PASSWORD)
mqtt_client.tls_set(tls_version=ssl.PROTOCOL_TLS)
mqtt_client.on_connect    = on_connect      # ← functions already defined above
mqtt_client.on_disconnect = on_disconnect
mqtt_client.connect(BROKER, PORT)
mqtt_client.loop_start()

print("=" * 50)
print("🫀 Guardian Pulse Pi — Started")
print(f"   HiveMQ:     {BROKER}")
print(f"   Cloudflare: {CLOUDFLARE_URL}")
print(f"   User ID:    {USER_ID}")
print("=" * 50)

# ── Main Loop ────────────────────────────────────────────────────
cf_counter = 0

try:
    while True:
        raw_value = float(ecg_pin.value)
        timestamp = time.time()
        detect_bpm(raw_value, timestamp)

        # Every 10ms → HiveMQ (live ECG chart in app)
        mqtt_client.publish(TOPIC_ECG, json.dumps({
            "v": raw_value, "t": timestamp,
            "bpm": current_bpm, "userId": USER_ID
        }))

        # Every ~1 second → Cloudflare (analysis + Firestore save)
        cf_counter += 1
        if cf_counter >= 100 and current_bpm > 0:
            cf_counter = 0
            iso_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            rr_ms    = round(60000 / current_bpm)

            threading.Thread(target=post_to_cloudflare, args=({
                "topic": TOPIC_ECG,
                "payload": {
                    "userId": USER_ID, "bpm": current_bpm,
                    "rawValue": raw_value, "rrInterval": rr_ms,
                    "timestamp": iso_time
                }
            },), daemon=True).start()

            if mpu:
                try:
                    ax, ay, az = mpu.acceleration
                    gx, gy, gz = mpu.gyro
                except Exception:
                    ax = ay = az = gx = gy = gz = 0.0

                mqtt_client.publish(TOPIC_MOTION, json.dumps({
                    "accelX": round(ax,3), "accelY": round(ay,3), "accelZ": round(az,3),
                    "gyroX": round(gx,3),  "gyroY": round(gy,3),  "gyroZ": round(gz,3),
                    "userId": USER_ID, "timestamp": iso_time
                }))

                threading.Thread(target=post_to_cloudflare, args=({
                    "topic": TOPIC_MOTION,
                    "payload": {
                        "userId": USER_ID,
                        "accelX": round(ax,3), "accelY": round(ay,3), "accelZ": round(az,3),
                        "gyroX": round(gx,3),  "gyroY": round(gy,3),  "gyroZ": round(gz,3),
                        "timestamp": iso_time
                    }
                },), daemon=True).start()

        print(f"ECG: {int(raw_value):5d} | BPM: {current_bpm:3d}", end="\r")
        time.sleep(0.01)

except KeyboardInterrupt:
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    print("\n⛔ Stopped.")