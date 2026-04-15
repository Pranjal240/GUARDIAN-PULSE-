# 🛡️ Guardian Pulse — Complete Project Understanding (Hinglish)

> Yeh document PURA project ka A to Z breakdown hai — har ek file, har ek connection, har ek feature ka detailed explanation in Hinglish.

---

## 📂 Project Structure — Monorepo Layout

```text
guardian-pulse/
├── 🍓 raspberry-pi/          ← Hardware (Python) — Sensors se data collect karta hai
├── ⚙️  backend/               ← Cloudflare Workers (JavaScript) — Backend brain
├── 🌐 website/                ← Next.js 16 (TypeScript/React) — Admin + Patient Web Dashboard
├── 📱 app/                    ← Flutter/Dart — Android/iOS Mobile App
├── 📄 docs/                   ← Internal documentation
├── 📄 steps/                  ← Setup steps & architectural notes
├── 🎨 logo/                   ← Branding assets
└── 🧩 .agent/skills/          ← AI agent skill definitions (development tools)
```

Yeh ek **monorepo** hai — matlab ek hi Git repository mein SAB kuch hai: hardware code, backend, web app, mobile app. Sab alag-alag folders mein organized hai.

---

## 🏗️ HIGH-LEVEL ARCHITECTURE — Pura System Kaise Kaam Karta Hai

```
┌──────────────┐    MQTT (10ms)     ┌──────────────┐    HTTP POST (1s)    ┌──────────────────┐
│  Raspberry Pi │ ──────────────────▸│ HiveMQ Cloud │                     │ Cloudflare Worker │
│  (AD8232 ECG) │                   │   Broker     │                     │  (Backend API)    │
│  (MPU6050)    │ ──────────────────────────────────────────────────────▸│                  │
└──────────────┘                   └──────┬───────┘                     └───────┬──────────┘
                                         │                                      │
                                         │ MQTT Subscribe                       │ Firebase REST API
                                         ▼                                      ▼
                                  ┌──────────────┐                     ┌──────────────────┐
                                  │ Flutter App  │ ◀──── onValue() ───│ Firebase RTDB    │
                                  │ (Patient)    │                     │ (Realtime DB)    │
                                  └──────────────┘                     └───────┬──────────┘
                                                                               │ onValue()
                                                                               ▼
                                                                      ┌──────────────────┐
                                                                      │  Next.js Website │
                                                                      │  (Admin Panel)   │
                                                                      └──────────────────┘
```

### Data Flow Summary:
1. **Raspberry Pi** sensors se ECG + motion data padta hai
2. Data dono jagah jaata hai simultaneously:
   - **HiveMQ MQTT Broker** pe (10ms interval — live chart ke liye)
   - **Cloudflare Worker** pe HTTP POST se (1 second interval — analysis + storage)
3. **Cloudflare Worker** data analyze karta hai (anomaly detection) aur **Firebase RTDB** mein save karta hai
4. **Flutter App** (patient ka phone) aur **Next.js Website** (admin dashboard) dono Firebase se `onValue()` real-time listeners se data read karte hain
5. Agar koi anomaly detect hoti hai → **FCM Push Notification** jaata hai, **SMS** jaata hai (Twilio), **Email** jaata hai (Resend)

---

## 🍓 RASPBERRY PI — Sensing Layer (`/raspberry-pi/`)

### File: `sensor_publisher.py`
**Language:** Python 3
**Purpose:** Yeh physical sensors se data read karke MQTT + HTTP dono pe publish karta hai.

### Hardware Connected:
| Component | Role | Connection |
|-----------|------|-----------|
| **AD8232** | ECG sensor — dil ki electrical activity read karta hai | ADS1115 ADC ke through I2C bus pe |
| **ADS1115** | 16-bit Analog-to-Digital Converter — AD8232 ka analog signal digital mein convert karta hai | I2C (`board.SCL`, `board.SDA`) |
| **MPU6050** | 6-axis motion sensor (accelerometer + gyroscope) — body ki movement/tremor detect karta hai | I2C (same bus) |

### Key Libraries:
```python
import board, busio                    # Hardware I2C communication
from adafruit_ads1x15.ads1115 import ADS1115  # ADC chip driver
from adafruit_ads1x15.analog_in import AnalogIn # Analog pin reading
import adafruit_mpu6050               # Motion sensor driver
import paho.mqtt.client as mqtt        # MQTT client for HiveMQ
import requests                        # HTTP POST to Cloudflare
```

### Kaise Kaam Karta Hai (Step by Step):

**1. ECG Reading (har 10ms — 100Hz sampling):**
```python
raw_value = float(ecg_pin.value)  # ADS1115 se 16-bit value padho
detect_bpm(raw_value, timestamp)   # Peak detection se BPM calculate karo
```

**2. BPM Detection Algorithm (`detect_bpm()`):**
- Yeh ek **peak detection** algorithm hai
- Jab signal ascending se descending hota hai (aur value > 15000), tab ek heartbeat peak mana jaata hai
- Last 8 peaks ke intervals ka average calculate karke BPM nikalta hai
- Formula: `BPM = 60 / average_interval_seconds`
- 0.3 second minimum gap rakha hai taaki false peaks filter ho

**3. Dual Publishing — Dono Jagah Data Bhejta Hai:**

**a) HiveMQ MQTT (har 10ms — Live Chart ke liye):**
```python
mqtt_client.publish("guardianpulse/ecg", json.dumps({
    "v": raw_value,     # Raw ECG voltage
    "t": timestamp,     # Unix timestamp
    "bpm": current_bpm, # Calculated BPM
    "userId": USER_ID   # Patient identifier
}))
```
- Topic: `guardianpulse/ecg`
- TLS encrypted connection (port 8883)
- Username/Password authentication
- Yeh data Flutter app mein direct MQTT subscribe se live ECG chart mein dikhta hai

**b) Cloudflare Worker HTTP POST (har ~1 second — Analysis ke liye):**
```python
if cf_counter >= 100 and current_bpm > 0:  # 100 iterations × 10ms = ~1 second
    threading.Thread(target=post_to_cloudflare, args=({
        "topic": "guardianpulse/ecg",
        "payload": {
            "userId": USER_ID,
            "bpm": current_bpm,
            "rawValue": raw_value,
            "rrInterval": rr_ms,
            "timestamp": iso_time
        }
    },), daemon=True).start()
```




- Thread mein POST karta hai taaki main loop block na ho
- `X-Pi-Secret` header se authenticate karta hai
- 3 retries with 1 second delay

---

### 🚨 SOS Video Call (Live Camera) Feature: Detailed Explanation

Yeh feature patient aur admin ke beech ek live video connection banata hai jab "SOS Emergency" trigger hota hai. Iske do main components hain: frontend pe `SOSCamera.tsx` (Patient side) aur `SOSCameraViewer.tsx` (Admin side). Yeh feature **WebRTC (Web Real-Time Communication)** ka use karke peer-to-peer (P2P) video streaming karta hai, aur Firebase Realtime Database ko as a **Signaling Server** use karta hai.

Agar WebRTC connection fail ho jaye, toh system ek **fallback mechanism** use karta hai, jismein har 5 second mein camera se photo (snapshot) click karke Firebase mein upload hoti hai aur admin side pe dikhti hai.

Chalo isko step-by-step samajhte hain ke yeh "under the hood" kaise kaam kar raha hai:

#### 1. Start Phase (Triggering the SOS)
1. **Patient triggers SOS:** Jab patient dashboard se SOS button press karta hai, `patient/page.tsx` mein ek alert trigger hota hai aur `setShowSOSCamera(true)` ho jata hai.
2. **`SOSCamera.tsx` Mounts:** Patient side pe yeh component screen ke bottom right mein pop up hota hai.
3. **Camera Permission:** Component `navigator.mediaDevices.getUserMedia()` call karke front camera ki (video: true, audio: false) stream mangta hai. User ko allow karna padta hai.
4. **Local Video:** Camera stream milte hi usko `<video autoPlay>` tag mein inject kar diya jata hai taaki patient khud ko dekh sake.

#### 2. WebRTC Signaling via Firebase

Real-time video bhejne ke liye dono browsers (Patient aur Admin) ko ek doosre ka pata aur connection details (IP address, ports, media formats) janni hoti hain. Ise **Signaling** kehte hain. Guardian Pulse mein Firebase ko signaling ke liye use kiya gaya hai.

1. **Patient Creates Offer (`SOSCamera.tsx`):**
   - Patient ek naya `RTCPeerConnection` object banata hai Google ke public STUN servers use karke (`stun.l.google.com:19302`).
   - Apni camera stream is connection mein daalta hai (`pc.addTrack(track, stream)`).
   - Ek **SDP Offer** (Session Description Protocol) create karta hai jo uske video capabilities batata hai.
   - Yeh offer Firebase mein `users/{userId}/webrtc/offer` pe likh diya jata hai.
2. **Admin Receives Offer (`SOSCameraViewer.tsx`):**
   - Admin ka dashboard lagaatar Firebase pe `users/{userId}/sosCamera/active` ko monitor kar raha hota hai.
   - Jaise hi flag `true` hota hai, Admin ka component jag jata hai aur `users/{userId}/webrtc/offer` ko read karta hai.
   - Admin bhi ek WebRTC connection banata hai aur Patient ke offer ko "Remote Description" set karta hai.
3. **Admin Creates Answer:**
   - Admin apni taraf se ek **SDP Answer** banata hai aur usko Firebase mein `users/{userId}/webrtc/answer` par likh deta hai.
4. **Patient Sets Answer:**
   - Patient Firebase se Admin ka answer padhta hai aur usko apni taraf "Remote Description" set kar leta hai.

#### 3. Handling Network Firewalls (ICE Candidates)

SDP offer/answer exchange ke ilawa, direct video bhejne ke liye dono ends ko apni public IP aur port details share karni padti hain (ise ICE Candidates bele hai).

1. Data flow ke beech, STUN servers dono clients (admin, patient) ko unske network path details (ICE candidates) dete hain.
2. Patient apne ICE candidates Firebase pe `users/{userId}/webrtc/offerCandidates` array mein push karta hai.
3. Admin wahan se candidates read karke apne connection mein add karta hai.
4. Same tareeqe se Admin bhi apne candidates Firebase pe push karta hai patient ke padhne ke liye.
5. Ek baar jab saari network conditions match ho jati hain, dono ke beech ek **direct P2P video stream chalu ho jati hai!** (Connection status "connected" ho jata hai aur Admin pe video show ho jata hai).

#### 4. The Jpeg Snapshot Fallback Mechanism

Corporate ya hospital wifis pe bohot saare port blocked hote hain jis wajah se WebRTC Direct P2P thoda unstable ho sakta hai. Agar admin aur patient ka direct WebRTC connection fail ho jaye, tab bhi system admin ko footage dikhata rehta hai. Yeh kaise hota hai?

- `SOSCamera.tsx` file mein ek `setInterval` loop laga hai.
- Yeh loop har **5 second** baad patient ki web camera stream se ek freeze frame leta hai, usko invisible HTML `<canvas>` grid pe drop karta hai, usko low-quality JPEG mein encode karta hai (taaki internet slowly load na ho).
- Phir iss jpeg string (Base64) ko `users/{userId}/sosCamera/frame` node mein upload kar deta hai Firebase real-time database mein.
- Udhar Admin side pe (`SOSCameraViewer.tsx`), component continuously check karta rehta hai ki connection bana ki nahi. Agar `isLive` true nahi hai (matlab WebRTC jud nai paaya), toh admin HTML `<video>` ko chupa deta hai aur Firebase wale naye Base64 image ke frames ko image `<img src={frame}>` mein daal key slideshow chalne lagta hai, so Admin can still see what is happening like a security camera feed!

#### 5. Termination (Stopping the SOS Video)

1. Jab patient side se video cutoff band kiya jata hai (`onClose()`), `SOSCamera.tsx` trigger hota hai.
2. Firebase mein `users/{userId}/sosCamera/active` false kar diya jata hai.
3. `webrtc` ka node Firebase se permanently delete kr dia jata hai so that next call properly shuru ho paaye without reading old states.
4. Admin side us frame node ko false dekhti hai and automatically video modal ko dismiss kr deti hai ("Camera Ended"). 

Yeh poora system ensure karta hai ki ek crucial emergency time mein bina kisi 3rd party video API (jaise Zoom or Agora) ke, completely **zero-cost** and **real-time** peer-to-peer video streaming achieve ki ja sake.
- RR Interval bhi bhejta hai: `rr_ms = 60000 / current_bpm` (milliseconds mein heartbeats ke beech ka gap)

**4. Motion Data (har ~1 second):**
```python
ax, ay, az = mpu.acceleration  # Accelerometer (g-force)
gx, gy, gz = mpu.gyro          # Gyroscope (degrees/sec)
```
- MQTT pe `guardianpulse/motion` topic pe publish hota hai
- Cloudflare Worker pe bhi POST hota hai
- Yeh data tremor detection aur seizure detection ke liye use hota hai

### Environment Variables:
```
GP_MQTT_HOST   → HiveMQ Cloud broker address
GP_MQTT_PORT   → 8883 (TLS encrypted)
GP_MQTT_USER   → HiveMQ username
GP_MQTT_PASS   → HiveMQ password
GP_CF_URL      → https://api.guardianpulse.in/sensor-data
GP_PI_SECRET   → Shared secret for authentication
GP_USER_ID     → Patient ka Clerk user ID
```

---

## ⚙️ BACKEND — Cloudflare Workers (`/backend/`)

### Deployment & Configuration
**Platform:** Cloudflare Workers (Serverless Edge Functions)
**Language:** JavaScript (ES Modules)
**Config File:** `wrangler.toml`
**Base URL:** `https://api.guardianpulse.in`

```toml
name = "guardian-pulse-api"
main = "src/index.js"

[triggers]
crons = ["* * * * *"]   # Har minute escalation check (cron job)

[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "guardian-pulse-media"   # R2 storage bucket
```

### Secrets (Cloudflare Dashboard mein set):
| Secret | Purpose |
|--------|---------|
| `CLERK_JWKS_URL` | Clerk ka public key endpoint — JWT verify karne ke liye |
| `RESEND_API_KEY` | Emergency email bhejne ke liye |
| `GEMINI_API_KEY` | AI chatbot (Gemini 1.5 Flash) ke liye |
| `TWILIO_ACCOUNT_SID` | SMS + Voice call ke liye |
| `TWILIO_AUTH_TOKEN` | Twilio authentication |
| `TWILIO_PHONE` | Twilio phone number (from number) |
| `PI_SECRET` | Raspberry Pi ka shared secret |
| `R2_PUBLIC_URL` | Cloudflare R2 bucket ka public URL |
| `FIREBASE_SERVER_KEY` | FCM Push notification bhejne ke liye |

---

### File: `src/index.js` — Main Router
**Yeh pura backend ka entry point hai. Sare API routes yahan define hain.**

#### CORS Configuration:
```javascript
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",     // Kisi bhi domain se request aaye
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Pi-Secret",
};
```
- `OPTIONS` request pe empty response + CORS headers return karta hai (preflight handling)

#### All API Routes:

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `GET /` | None | Health check — `"Guardian Pulse API is Live 🫀"` |
| `POST /sensor-data` | `X-Pi-Secret` header | Raspberry Pi se sensor data receive karta hai |
| `POST /alert-user` | Clerk JWT | Manual alert create karta hai |
| `POST /resolve-alert` | Clerk JWT | User ne "I'M OKAY" dabaya — alert resolve |
| `POST /chat` | Clerk JWT | AI chatbot ko message bhejta hai |
| `POST /support-request` | Clerk JWT | Live human support request |
| `POST /upload-media` | Clerk JWT | R2 pe file upload (chat ke liye) |
| `GET /patient-data` | Clerk JWT | Admin ko patient ka sensor history deta hai |
| `POST /update-alert-location` | Clerk JWT | Alert ke dauran GPS location update |
| `POST /save-fcm-token` | Clerk JWT | FCM push notification token save |

#### `handleSensorData()` — Sensor Data Processing (SABSE IMPORTANT):

Jab Raspberry Pi se data aata hai, yeh flow chalta hai:
2
```
Pi → POST /sensor-data → verifyPiSecret() → Parse payload
                                                    │
                                                    ├── ECG Topic:
                                                    │   1. User ka mode fetch karo (normal/sleep/parkinson)
                                                    │   2. Last 30 ECG readings Firebase se fetch karo
                                                    │   3. Last 50 motion readings fetch karo
                                                    │   4. detectAnomalies() run karo
                                                    │   5. Firebase mein ecg_readings push karo
                                                    │   6. Agar anomaly hai → triggerAlert()
                                                    │
                                                    └── Motion Topic:
                                                        1. Motion data Firebase mein push karo
```

**Alert Throttling:** Ek user ke liye 5 minute mein sirf ek alert trigger hoga — spam se bacho:
```javascript
const throttleMs = 5 * 60 * 1000;  // 5 minutes
const shouldAlert = !lastAlert || Date.now() - lastAlert.createdAt > throttleMs;
```

#### Scheduled Cron (`scheduled()`):
- Har minute Cloudflare cron trigger hota hai
- `escalateAlerts()` function call hota hai
- Sare pending alerts check hote hain — agar 2 min se zyada old hain to SMS/Email bhejo, 8 min se zyada ho to critical escalation

---

### File: `src/ecg-logic.js` — Medical Anomaly Detection Engine

**Yeh file sabse critical hai — yahan actual medical analysis hoti hai.**

#### BPM Thresholds:
```javascript
const BPM_THRESHOLDS = {
  critical_high: 180,  // Extreme tachycardia
  warning_high: 130,   // Tachycardia
  normal_high: 100,
  normal_low: 60,
  warning_low: 50,     // Bradycardia
  critical_low: 40,    // Extreme bradycardia
};
```

#### Mode-Specific Thresholds:
| Mode | High | Low | Reason |
|------|------|-----|--------|
| `normal` | 130 | 50 | Standard adult thresholds |
| `sleep` | 150 | 40 | Sleep mein BPM naturally low rehta hai |
| `parkinson` | 120 | 55 | Parkinson's patients ka zyada closely monitor |

#### `detectAnomalies()` — Main Analysis Function:
```
Input: ecgReadings[] + motionReadings[] + mode + baselineBpm
                          │
                          ├── 1. RR Intervals calculate karo (BPM → milliseconds)
                          ├── 2. HRV (Heart Rate Variability) calculate karo
                          ├── 3. Seizure detection run karo
                          ├── 4. Tremor detection run karo
                          ├── 5. Stress score calculate karo
                          └── 6. Most critical anomaly pick karo
```

**Priority Order:**
1. **Seizure** (confidence ≥ 5/9) → `severity: critical`
2. **Cardiac** (BPM critical range mein) → `severity: critical`
3. **Parkinson Tremor** (only in parkinson mode) → `severity: medium`
4. **Stress/Warning** (high stress or BPM warning) → `severity: medium/high`

#### `detectSeizure()` — Seizure Detection:
Yeh 3 indicators combine karke seizure detect karta hai:

| Indicator | How Detected | Score |
|-----------|-------------|-------|
| **BPM Jump** | Adjacent readings mein ≥30 BPM difference | +2 |
| **High ECG SD** | Raw ECG signal ka standard deviation > 400 | +2 |
| **Motion Jerk** | Accelerometer magnitude > 2.5g | +3 |
| **Both BPM + Jerk** | Dono match hone pe bonus | +2 |

Total 9 points possible — **≥ 5 score pe seizure detected** mana jaata hai.

#### `detectTremor()` — Parkinson's Tremor Detection:
```
Gyroscope Z-axis data → Zero-crossing frequency estimation
                              │
                              ├── 4-6 Hz → Parkinson's resting tremor
                              ├── 8-12 Hz → Essential tremor
                              └── 3-8 Hz → Unknown type
```
- RMS (Root Mean Square) se intensity calculate hoti hai
- Threshold: RMS > 0.5 tabhi tremor count hota hai
- Sample rate: 50 Hz (Pi 50 Hz pe sample karta hai)

#### `calculateStress()` — Multi-Factor Stress Score (0-100):
```
Stress = BPM Deviation (0-40) + HRV Deficit (0-40) + Tremor (0-20)
```
- **BPM Deviation:** `min(|bpm - baseline| × 1.5, 40)` — Baseline se kitna door hai
- **HRV Deficit:** `min(40 - hrv × 0.8, 40)` — Low HRV = high stress
- **Tremor:** `min(tremor_intensity × 0.2, 20)`

Categories: Low (<30), Moderate (30-60), High (60-80), Critical (>80)

#### `calculateHRV()` — Heart Rate Variability:
- **RMSSD method** use hota hai (Root Mean Square of Successive Differences)
- Normal: 20-70ms
- Low (<20ms) = stress/fatigue indicator
- Formula: `√(Σ(RR[i] - RR[i-1])² / N)`

---

### File: `src/alert-engine.js` — Alert & Notification System

**Yeh file emergency response system hai — FCM, SMS, Email, Escalation sab yahan se hota hai.**

#### Alert Lifecycle — Timeline:

```
t=0 min   →  Alert created in Firebase
              FCM Push notification → Patient ka phone
              120-second countdown shuru app mein

t=2 min   →  Patient ne respond nahi kiya?
              SMS → Emergency Contact 1 (Twilio)
              Email → Emergency Contact 1 (Resend)
              Alert status: "pending" → "escalated"

t=8 min   →  Ab bhi resolve nahi hua?
              SMS → Emergency Contact 2
              CRITICAL Email → All contacts
              Alert status: "escalated" → "critical"
```

#### `triggerAlert()` Function:
1. Firebase RTDB mein `/alerts` ke under naya document push karo
2. User ka `fcmToken` fetch karo `/users/{userId}` se
3. FCM push notification bhejo via Firebase Cloud Messaging REST API
4. Alert document mein timeline maintain karo

#### `sendTwilioSMS()` — SMS via Twilio:
```javascript
const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
// Basic auth se Twilio REST API call
POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json
```
SMS body mein patient ka naam, alert type, aur Google Maps location link hota hai.

#### `sendEmergencyEmail()` — Email via Resend:
```javascript
POST https://api.resend.com/emails
Authorization: Bearer ${RESEND_API_KEY}
From: "Guardian Pulse Alerts <alerts@guardianpulse.in>"
```
- HTML formatted email with branding
- Urgent emails mein red theme (#7B0000 background)
- Normal alerts mein green theme (#1A2E1F background)
- Google Maps link via `https://maps.google.com/?q={lat},{lng}`

#### Alert Labels:
```javascript
cardiac:         { title: "⚠️ Cardiac Alert",     emoji: "❤️‍🔥" }
seizure:         { title: "🚨 Seizure Detected",   emoji: "🧠"  }
panic:           { title: "⚠️ Panic Attack",       emoji: "😰"  }
parkinson_tremor:{ title: "🔵 Tremor Detected",    emoji: "🤲"  }
ptsd:            { title: "⚠️ PTSD Episode",       emoji: "🌩️"  }
stress:          { title: "⚠️ High Stress",        emoji: "🔴"  }
```

---

### File: `src/chatbot.js` — AI Health Chatbot (Gemini 1.5 Flash + RAG)

**Yeh patient ke liye AI health assistant hai — Gemini 1.5 Flash model use karta hai RAG ke saath.**

#### How RAG (Retrieval-Augmented Generation) Works:

```
User Message → "mera chest pain ho raha hai"
                    │
                    ├── 1. Gemini Text Embedding API se message ka vector nikalo
                    │     (model: text-embedding-004)
                    │
                    ├── 2. Firebase se rag_documents fetch karo (pre-embedded medical docs)
                    │
                    ├── 3. Cosine similarity se top 3 relevant chunks nikalo
                    │     (threshold: score ≥ 0.7 hona chahiye)
                    │
                    ├── 4. Patient ka health context build karo:
                    │     - Latest BPM, Stress Level, Tremor status
                    │     - Recent alerts history
                    │     - Monitoring mode (normal/sleep/parkinson)
                    │     - Emergency contact info
                    │
                    └── 5. Gemini 1.5 Flash ko call karo with:
                          - System prompt (strict medical rules)
                          - Patient health data
                          - RAG medical context
                          - Last 10 conversation messages
                          - Current user message
```

#### System Prompt Rules:
1. SIRF health topics discuss karo — baaki refuse karo politely
2. KABHI diagnose mat karo — doctor se milne bolo
3. Agar emergency lag rahi hai → "Connect to Support" ya "Call 112" suggest karo
4. Empathetic aur simple language use karo
5. Patient data personalize karo response mein

#### Support Trigger Detection:
Agar user message mein yeh phrases hain → `needsSupport = true`:
```javascript
["connect to support", "speak to someone", "urgent",
 "emergency", "cant breathe", "chest pain", "help me", "dying", "scared"]
```

#### Gemini API Configuration:
```javascript
temperature: 0.7      // Balanced creativity
maxOutputTokens: 512   // Concise but helpful
topP: 0.9             // Diverse but relevant
```

---

### File: `src/firebase.js` — Firebase REST API Helpers

**Yeh file backend se Firebase Realtime Database ko REST API se access karta hai.**

> Cloudflare Workers mein Firebase Admin SDK nahi chalti (Node.js dependency), isliye REST API use karta hai.

#### Functions:
| Function | Firebase REST Equivalent | Description |
|----------|------------------------|-------------|
| `dbPush(path, data)` | `POST /{path}.json` | Naya record add karo (auto-generated ID) |
| `dbSet(path, data)` | `PUT /{path}.json` | Record overwrite karo |
| `dbGet(path)` | `GET /{path}.json` | Ek record padho |
| `dbQuery(path, orderBy, equalTo, limit)` | `GET /{path}.json?orderBy=...` | Filtered query karo |
| `dbUpdate(path, data)` | `PATCH /{path}.json` | Record partially update karo |
| `sendFCM(token, title, body, data)` | `POST https://fcm.googleapis.com/fcm/send` | Push notification bhejo |

Authentication: `?auth=AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc` (Firebase Web API Key)

---

### File: `src/auth.js` — Authentication Module

**Two types of auth handle karta hai:**

#### 1. Clerk JWT Verification (`verifyClerkJWT()`):
```
Bearer Token → Decode JWT header → Get kid (key ID)
→ Fetch JWKS from Clerk → Find matching public key
→ Import as CryptoKey → Verify RSA signature
→ Check expiry → Extract userId from 'sub' claim
```
- Cloudflare Workers mein `crypto.subtle` API use hota hai (Web Crypto API)
- Algorithm: RSASSA-PKCS1-v1_5 with SHA-256

#### 2. Pi Secret Verification (`verifyPiSecret()`):
```javascript
const piSecret = request.headers.get('X-Pi-Secret');
if (piSecret !== env.PI_SECRET) throw new Error('Invalid Pi secret');
```
Simple shared secret — Pi ke requests ke liye. JWT nahi use karta kyunki Pi pe Clerk SDK nahi hai.

---

### File: `src/r2-media.js` — Cloudflare R2 Storage

**File upload/download handle karta hai — Firebase Storage ka replacement.**

#### Why R2?
- **Zero egress fees** (Firebase Storage pe egress charge lagta hai)
- 10 GB free storage
- 1 Million uploads/month free
- Native Cloudflare Workers integration

#### Upload Flow:
```
User (Flutter App) → POST /upload-media → FormData with file
→ Validate file type (jpeg, png, webp, gif, mp4, webm, pdf)
→ Validate size (max 50 MB)
→ Generate path: {type}/{userId}/{timestamp}-{filename}
→ env.MEDIA_BUCKET.put() → R2 mein store
→ Return public URL: {R2_PUBLIC_URL}/{path}
```

---

## 🌐 WEBSITE — Next.js Admin + Patient Dashboard (`/website/`)

### Technology Stack:
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.1.7 | React framework with App Router |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5+ | Type safety |
| **Tailwind CSS** | 4 | Utility-first styling |
| **Framer Motion** | 12.38.0 | Animations & transitions |
| **Recharts** | 3.8.0 | Charts & data visualization |
| **Clerk** | 7.0.5 | Authentication (Sign-in/Sign-up) |
| **Firebase** | 12.10.0 | Real-time database client |
| **Radix UI** | Various | Accessible UI primitives (Dialog, Tabs, etc.) |
| **React Hot Toast** | 2.6.0 | Notification toasts |
| **Lucide React** | 0.577.0 | Icon library |
| **date-fns** | 4.1.0 | Date formatting |

### Hosting & Deployment:
- **Vercel** pe hosted hai
- Domain: `www.guardianpulse.in`
- `vercel.json`: `{ "framework": "nextjs" }`
- Auto-deploy on Git push

---

### Route Structure (App Router):

```
src/app/
├── layout.tsx              ← Root layout (ClerkProvider + Toaster)
├── page.tsx                ← Landing page (www.guardianpulse.in)
├── globals.css             ← Global styles (19KB — massive design system)
├── sign-in/[[...sign-in]]/ ← Clerk sign-in page
├── sign-up/[[...sign-up]]/ ← Clerk sign-up page
├── pending-admin/          ← Pending admin approval waiting screen
├── patient/
│   └── page.tsx            ← Patient Dashboard (58KB — massive page)
└── dashboard/
    ├── layout.tsx           ← Admin layout (Sidebar + TopHeader + AnimatePresence)
    ├── page.tsx             ← Admin Overview/Home (18KB)
    ├── patients/            ← Patient management page
    ├── alerts/              ← Active alerts monitoring
    ├── ecg/                 ← ECG data viewer
    ├── ecg-monitor/         ← Live ECG monitor
    ├── analytics/           ← Analytics & charts
    ├── admin-requests/      ← Admin approval panel
    ├── audit-log/           ← Action audit trail
    ├── settings/            ← Admin settings
    └── support/             ← Support tickets
```

---

### File: `src/app/layout.tsx` — Root Layout

**Pura app ka wrapper — Clerk aur theming yahan setup hai.**

```tsx
<ClerkProvider
  publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
  appearance={{
    baseTheme: dark,
    variables: {
      colorPrimary: '#D4B896',           // Gold/Champagne
      colorBackground: '#1C2B1E',        // Dark Forest Green
      colorInputBackground: '#111811',   // Deep Black-Green
      colorText: '#F0E6D3',             // Warm Cream
      colorTextSecondary: '#A8B5A2',    // Muted Sage
      colorDanger: '#E05252',           // Alert Red
    },
  }}
>
```

**Design Theme:** "Military Medical" — Deep forest greens + champagne gold + warm cream text.
- Background: `#1C2B1E` (dark green)
- Primary: `#D4B896` (champagne gold)
- Text: `#F2E8D9` (warm cream)
- Danger: `#E05252` (alert red)

---

### File: `src/app/dashboard/layout.tsx` — Admin Dashboard Layout

**Admin pages ka shell — Sidebar + Header + Page transitions:**

```tsx
<div className="flex bg-[#141A14] min-h-screen">
  <div className="ambient-mesh" />        {/* Background gradient effect */}
  <Sidebar />                              {/* Left navigation */}
  <div className="flex-1 md:ml-60">
    <TopHeader />                          {/* Top bar with user info */}
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.4 }}
      >
        {children}                         {/* Page content with blur transition */}
      </motion.div>
    </AnimatePresence>
  </div>
</div>
```

**Page Transitions:** Har page change pe blur + fade + slide animation hoti hai via Framer Motion:
- Entry: opacity 0 → 1, y 16px → 0px, blur 4px → 0px
- Exit: opacity 1 → 0, y 0 → -12px, blur 0px → 4px

---

### File: `src/lib/firebase.ts` — Frontend Firebase Config

```typescript
const firebaseConfig = {
  apiKey: 'AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc',
  databaseURL: 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'guardian-pulse-1360c',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getDatabase(app);
```

- `getApps().length === 0` check hai taaki hot-reload pe duplicate initialization na ho
- **Firebase Realtime Database** use ho raha hai (Firestore nahi!)
- Region: `asia-southeast1` (Singapore)

---

### File: `src/lib/firebase-hooks.ts` — Real-time Data Hooks (THE BRAIN OF THE WEB APP)

**Yeh file sabse important hai website mein — sare real-time Firebase listeners yahan defined hain as React hooks.**

#### All Custom Hooks:

| Hook | Firebase Path | Description |
|------|---------------|-------------|
| `useAllPatients()` | `/users` where `role=patient` | Sare patients list karo + email se deduplicate karo |
| `usePatientECG(userId)` | `/ecg_readings` where `userId=X` | Ek patient ki ECG history (last 60 readings) |
| `useLatestECGPerPatient(ids[])` | `/ecg_readings` per patient | Multiple patients ki latest 30 ECG readings |
| `useActiveAlerts()` | `/alerts` where `status≠resolved` | Active (unresolved) alerts |
| `useAllAlerts(days)` | `/alerts` last N days | Alert history |
| `useChatMessages(userId)` | `/chat_messages` where `userId=X` | Chat conversation |
| `useUserProfile(userId)` | `/users/{userId}` | Single user profile |
| `useSystemStats()` | Composite hook | Total patients, active alerts, avg BPM, critical today |
| `useAdminRequests()` | `/admin_requests` | Admin access requests |
| `usePendingAdminCount()` | Derived from `useAdminRequests` | Pending requests count for badge |
| `useUserRole(userId)` | `/users/{userId}/role` | User ka role (patient/admin) |
| `useAuditLog(limit)` | `/audit_log` | Admin actions audit trail |
| `useLiveVitals(userId)` | `/ecg_readings` + `/motion_data` + `/users` | Combined live vitals with connection status |
| `usePatientDemoVitals(userId)` | `/users/{userId}/lastVitals` | Pre-seeded demo vitals |
| `useSupportRequestCount()` | Derived from `useAllPatients` | Patients who need support |

#### Patient Deduplication Logic (`useAllPatients()`):
Multiple Firebase nodes same email ke ho sakte hain (jab Clerk ID change hota hai). Fix:
```typescript
// 1. Sare patients fetch karo
// 2. Email se group karo (Map<email, Patient>)
// 3. Same email pe → most recently active Patient rakho
// 4. Activity time: lastActive || lastVitals.updatedAt
// 5. Sort by activity (newest first)
```

#### Helper Functions:

| Function | Purpose |
|----------|---------|
| `calculateBpmStatus(bpm)` | `<50 or >130` → critical, `50-60 or 100-130` → warning, else normal |
| `calculateHRV(rrIntervals)` | RMSSD Heart Rate Variability |
| `calculateStressLevel(bpm, hrv, tremor)` | 0-100 stress score |
| `detectTremorFromMotion(data)` | Zero-crossing frequency from accelerometer |
| `classifyAlertType(type)` | Alert type → color + icon + label mapping |

---

### File: `src/lib/demo-data-seeder.ts` — Demo Data Generator

**Jab REAL Raspberry Pi connected nahi hota, yeh simulated data generate karke Firebase mein likhta hai.**

#### Kaise Kaam Karta Hai:

1. **Per-Patient Deterministic Baselines:**
   - Har patient ka ek unique baseline hota hai based on userId hash
   - `simpleHash(userId)` se deterministic number nikalta hai
   - Different hash bits se different vitals generate hote hain:
     ```
     spO2: 96-99, hrv: 36-55, stress: 18-39, bodyTemp: 97.8-99.0
     respRate: 14-18, bloodPressureSys: 112-127, tremorScore: 4-13, etc.
     ```

2. **BPM Simulation (Realistic):**
   - Starting BPM: 68-79 (resting range, hash-based)
   - Target BPM shifts every 45-60 seconds (slow, realistic trends)
   - Each 3-second tick: BPM moves 15% towards target + ±1 noise
   - Range clamped: 55-100 BPM

3. **ECG Reading Write (every 3 seconds):**
   ```typescript
   push(ref(db, 'ecg_readings'), {
     userId,
     bpm: state.lastBpm,
     voltage: 0.8 + random * 0.4,
     timestamp: Date.now(),
     isAnomaly: bpm > 100 || bpm < 55,
     motionData: { accelX, accelY, accelZ },
     rrIntervals: [800 ± 50ms × 5],
   });
   ```

4. **Demo Vitals Seed (`seedDemoVitals()`):**
   - User profile + baseline vitals Firebase mein ek baar likh deta hai
   - Admin dashboard turant vitals dekhne lagta hai
   - Clerk profile sync bhi karta hai (name, email, avatar)

---

### File: `src/hooks/useECGWaveform.ts` — High-Performance ECG Waveform

**Yeh client-side synthetic ECG waveform generate karta hai for visual display.**

#### Architecture:
- `useSyncExternalStore` use karta hai (React 18+ API) — setState nahi
- `requestAnimationFrame` loop (throttled to `targetFps`, default 24 FPS)
- Ring buffer pattern — har frame pe shift + push (no new array allocation)

#### PQRST Waveform Generation:
Ek heartbeat cycle ko 0.0-1.0 phase mein map karta hai:

| Phase | Waveform | Amplitude | Medical Meaning |
|-------|----------|-----------|-----------------|
| 0.10 - 0.20 | P-wave | 0.25 | Atrial depolarization |
| 0.22 - 0.24 | Q-wave | -0.20 | Septal depolarization |
| 0.24 - 0.28 | R-wave (QRS) | 2.50 | Ventricular depolarization (TALLEST PEAK) |
| 0.28 - 0.32 | S-wave | -0.60 | Ventricular depolarization end |
| 0.45 - 0.65 | T-wave | 0.40 | Ventricular repolarization |

Plus realistic noise: `(Math.random() - 0.5) * 0.06` + wandering baseline: `sin(now / 1200) * 0.08`

---

### Components (`src/components/`):

| Component | File | Purpose |
|-----------|------|---------|
| **Sidebar** | `Sidebar.tsx` | Left navigation panel with all dashboard links + pending admin badge |
| **TopHeader** | `TopHeader.tsx` | Top bar with search, user avatar, notifications |
| **LiveECGChart** | `LiveECGChart.tsx` | Real-time ECG line chart using Recharts + useECGWaveform hook |
| **EcgChart** | `EcgChart.tsx` | Static ECG data visualization |
| **PatientECGCard** | `PatientECGCard.tsx` | Patient card with embedded ECG preview |
| **BpmDisplay** | `BpmDisplay.tsx` | Animated BPM number display |
| **StatCard** | `StatCard.tsx` | Dashboard stat card with icon + value + trend |
| **ActiveAlertCard** | `ActiveAlertCard.tsx` | Alert card with timeline progress + actions |
| **SOSCamera** | `SOSCamera.tsx` | Patient-side WebRTC camera (SOS mode) |
| **SOSCameraViewer** | `SOSCameraViewer.tsx` | Admin-side WebRTC viewer (watch patient feed) |
| **ImageLightbox** | `ImageLightbox.tsx` | Full-screen image/media viewer |
| **DiagnosticReportsList** | `DiagnosticReportsList.tsx` | Medical diagnostic reports display |
| **SkeletonCard** | `SkeletonCard.tsx` | Loading skeleton placeholder |

---

### SOS Camera — WebRTC Video Streaming (MOST ADVANCED FEATURE)

**Patient emergency pe live camera feed admin ko dikhta hai via peer-to-peer WebRTC.**

#### SignalingFlow (Firebase as Signaling Server):

```
PATIENT SIDE (SOSCamera.tsx):
1. getUserMedia() se camera access lo
2. RTCPeerConnection create karo (STUN servers: Google's public servers)
3. Camera tracks add karo connection mein
4. SDP Offer create karo → Firebase pe likho: /users/{uid}/webrtc/offer
5. ICE Candidates → Firebase pe: /users/{uid}/webrtc/offerCandidates
6. Firebase listener: admin ka SDP Answer aane ka wait karo
7. Admin ke ICE Candidates bhi Firebase se padho
8. Connection established → P2P video streaming shuru!

Fallback: Har 5 second pe JPEG snapshot capture → Firebase pe base64 mein likho
          (/users/{uid}/sosCamera/frame)

ADMIN SIDE (SOSCameraViewer.tsx):
1. Firebase pe /users/{uid}/webrtc/offer listener lagao
2. Offer aaye → RTCPeerConnection create karo
3. SDP Answer create karo → Firebase pe likho: /users/{uid}/webrtc/answer
4. ICE Candidates exchange karo
5. ontrack event pe video stream receive karo
6. Fallback: Firebase se JPEG snapshots padho aur display karo
```

#### ICE Configuration:
```javascript
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun1.l.google.com:19302' },
    { urls: 'stun2.l.google.com:19302' },
    { urls: 'stun3.l.google.com:19302' },
  ],
};
```
STUN servers NAT traversal ke liye use hote hain — taaki patient aur admin dono apna public IP discover kar sake connection ke liye.

---

### Firebase Realtime Database Schema:

```
guardian-pulse-1360c-default-rtdb/
│
├── users/
│   └── {userId}/
│       ├── name: string
│       ├── email: string
│       ├── phone: string
│       ├── role: "patient" | "admin" | "pending_admin"
│       ├── mode: "normal" | "sleep" | "parkinson"
│       ├── avatarUrl: string
│       ├── fcmToken: string (FCM push notification token)
│       ├── lastActive: timestamp
│       ├── needsSupport: boolean
│       ├── emergencyContact1Name: string
│       ├── emergencyContact1Phone: string
│       ├── emergencyContact1Email: string
│       ├── lastVitals/
│       │   ├── spO2, hrv, stress, bodyTemp, respRate...
│       │   └── updatedAt: timestamp
│       ├── sosCamera/
│       │   ├── active: boolean
│       │   ├── frame: base64 JPEG string
│       │   └── updatedAt: timestamp
│       └── webrtc/
│           ├── offer: { sdp, type }
│           ├── answer: { sdp, type }
│           ├── offerCandidates/
│           └── answerCandidates/
│
├── ecg_readings/
│   └── {auto_id}/
│       ├── userId: string
│       ├── bpm: number
│       ├── voltage: number
│       ├── rrInterval: number
│       ├── isAnomaly: boolean
│       ├── anomalyType: string | null
│       ├── stressLevel: number
│       ├── motionData: { accelX, accelY, accelZ }
│       ├── rrIntervals: number[]
│       └── timestamp: number | ISO string
│
├── motion_data/
│   └── {auto_id}/
│       ├── userId: string
│       ├── accelX/Y/Z: number (g-force)
│       ├── gyroX/Y/Z: number (degrees/sec)
│       ├── tremorDetected: boolean
│       ├── tremorFrequency: number (Hz)
│       ├── stressLevel: number
│       └── timestamp: ISO string
│
├── alerts/
│   └── {auto_id}/
│       ├── userId: string
│       ├── alertType: "cardiac" | "seizure" | "panic" | "parkinson_tremor" | "ptsd"
│       ├── severity: "low" | "medium" | "high" | "critical"
│       ├── status: "pending" | "escalated" | "critical" | "resolved"
│       ├── bpm: number
│       ├── stressLevel: number
│       ├── lat/lng: number (GPS coordinates)
│       ├── createdAt: ISO string
│       ├── resolvedAt: ISO string | null
│       └── timeline: [{ step, time, detail }]
│
├── chat_messages/
│   └── {auto_id}/
│       ├── userId: string
│       ├── message: string
│       ├── sender: "user" | "ai" | "system" | "support"
│       ├── mediaUrl: string | null
│       ├── needsSupport: boolean
│       └── timestamp: ISO string
│
├── admin_requests/
│   └── {userId}/
│       ├── email, name, avatarUrl: string
│       ├── requestedAt: timestamp
│       ├── status: "pending" | "approved" | "rejected"
│       ├── reviewedBy: string
│       └── reviewedAt: timestamp
│
├── audit_log/
│   └── {auto_id}/
│       ├── action: string
│       ├── performedBy: string (userId)
│       ├── performedByName: string
│       ├── targetUserId: string
│       ├── details: string
│       └── timestamp: number
│
└── rag_documents/
    └── {auto_id}/
        ├── chunkText: string (medical document text)
        ├── embedding: number[] (Gemini text-embedding-004 vector)
        └── active: boolean
```

### Database Rules (`database.rules.json`):
```json
{
  "rules": {
    ".read": "true",   // Open read (Clerk JWT se security handle hoti hai app level pe)
    ".write": "true",  // Open write
    "chat_messages": { ".indexOn": ["userId", "timestamp"] },
    "ecg_readings":  { ".indexOn": ["userId", "timestamp"] },
    "alerts":        { ".indexOn": ["userId", "status", "createdAt"] },
    "users":         { ".indexOn": ["role", "email"] }
  }
}
```
> **Note:** Read/write true hai kyunki authentication Clerk level pe handle hoti hai, Firebase rules sirf indexing ke liye use ho rahi hain.

---

## 📱 FLUTTER APP — Mobile Application (`/app/`)

### Technology Stack:
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Flutter** | 3.x | Cross-platform UI framework |
| **Dart** | ≥3.0.0 | Programming language |
| **Firebase Core** | 2.32.0 | Firebase initialization |
| **Firebase Database** | 10.5.7 | Realtime Database read/write |
| **Firebase Messaging** | 14.9.4 | FCM Push Notifications |
| **Flutter Riverpod** | 2.6.1 | State management |
| **FL Chart** | 0.66.2 | ECG & vitals charts |
| **Geolocator** | 11.0.0 | GPS location tracking |
| **MQTT Client** | 10.11.9 | Direct MQTT subscription (optional) |
| **Hive Flutter** | 1.1.0 | 30-day offline ECG cache |
| **Flutter Secure Storage** | 9.0.0 | Encrypted key-value store |
| **Flutter Animate** | 4.3.0 | UI animations |
| **Lottie** | 3.0.0 | Animated illustrations |
| **Google Fonts** | 6.1.0 | Typography |

---

### File: `lib/main.dart` — App Entry Point

```dart
Future<void> main() async {
  // 1. Firebase initialize karo (same project as website)
  await Firebase.initializeApp(options: FirebaseOptions(...));

  // 2. Background FCM handler register karo
  FirebaseMessaging.onBackgroundMessage(_backgroundHandler);

  // 3. Hive initialize karo (local 30-day ECG cache)
  await Hive.initFlutter();
  await Hive.openBox('ecg_cache');
  await Hive.openBox('settings');

  // 4. Firebase RTDB service init karo
  DatabaseService.instance.init();

  // 5. App run karo with Riverpod state management
  runApp(ProviderScope(child: GuardianPulseApp()));
}
```

- `ClerkAuth` wrapper se authentication handle hoti hai
- `MaterialApp` with custom dark theme (`AppTheme.dark`)
- Entry screen: `SplashScreen`

---

### File: `lib/services/database_service.dart` — Firebase RTDB Service

**Singleton pattern — ek hi instance pure app mein use hota hai.**

```dart
class DatabaseService {
  DatabaseService._();
  static final DatabaseService instance = DatabaseService._();

  void init() {
    _db = FirebaseDatabase.instanceFor(
      app: Firebase.app(),
      databaseURL: 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app',
    );
    _db.setPersistenceEnabled(true);  // Offline support!
  }
}
```

#### Key Functions:
| Function | Firebase Path | Purpose |
|----------|---------------|---------|
| `watchProfile(userId)` | `/users/{userId}` | Real-time profile stream |
| `writeProfile(userId, data)` | `/users/{userId}` | Initial profile write |
| `updateProfile(userId, data)` | `/users/{userId}` | Partial profile update |
| `watchEcgReadings(userId)` | `/ecg_readings` orderBy `userId` | Real-time ECG stream |
| `getEcgHistory(userId)` | `/ecg_readings` last 200 | Historical ECG fetch |
| `watchMotionData(userId)` | `/motion_data` | Real-time motion stream |
| `watchAlerts(userId)` | `/alerts` where `status≠resolved` | Active alerts stream |
| `watchChatMessages(userId)` | `/chat_messages` orderBy `userId` | Chat stream |
| `sendChatMessage(message)` | `/chat_messages` push | Send new chat message |
| `watchAllPatients()` | `/users` where `role=patient` | Admin: all patients |

**Offline Support:** `setPersistenceEnabled(true)` — agar phone offline hai, cached data dikhega. Online aane pe auto-sync hoga.

---

### File: `lib/services/api_service.dart` — Cloudflare Worker API Client

**Sare backend API calls yahan centralized hain.**

```dart
class ApiService {
  static const String _baseUrl = 'https://api.guardianpulse.in';

  static Future<String> _getToken() async {
    final token = await ClerkAuth.session?.getToken();
    // Clerk se JWT token nikal ke har request ke header mein bhejta hai
  }
}
```

#### API Calls:
| Function | Endpoint | Purpose |
|----------|----------|---------|
| `sendChatMessage()` | `POST /chat` | AI chatbot ko message bhejo |
| `resolveAlert()` | `POST /resolve-alert` | "I'M OKAY" tapne pe alert resolve |
| `updateAlertLocation()` | `POST /update-alert-location` | GPS location update during alert |
| `requestSupport()` | `POST /support-request` | Live human support request |
| `uploadMedia()` | `POST /upload-media` | Chat mein photo/video attach karo |
| `getPatientData()` | `GET /patient-data` | Admin: patient history fetch |
| `saveFcmToken()` | `POST /save-fcm-token` | Login ke baad FCM token save karo |

---

### File: `lib/services/alert_service.dart` — Emergency Alert Handler

**Yeh patient ke phone pe emergency dialogs + local notifications handle karta hai.**

```dart
class AlertService {
  void startListening(String userId, BuildContext context) {
    // Firebase RTDB pe /alerts listen karo
    // Jab naya "pending" alert aaye:
    //   1. Local notification dikhao (Android + iOS)
    //   2. Full-screen emergency dialog dikhao:
    //      - "I'm Safe" button → alert acknowledge
    //      - "Call 112" button → emergency number call

    FirebaseDatabase.instance
      .ref('alerts')
      .orderByChild('userId')
      .equalTo(userId)
      .onChildAdded
      .listen((event) {
        if (data['status'] == 'pending') {
          _showNotification(data);           // System notification
          _showEmergencyDialog(context, data); // In-app dialog
        }
      });
  }
}
```

Emergency Dialog design:
- Background: `#2A1A1A` (dark red)
- Title: 🚨 Medical Emergency (red)
- Body: Alert type + "Emergency contacts have been notified"
- Actions: "I'm Safe" (gold) + "Call 112" (red button)

---

### File: `lib/services/mqtt_service.dart` — MQTT Service (Stub)

**Yeh currently ek stub hai — real MQTT direct connection nahi karta.**

```dart
class MqttService {
  // MQTT is optional — Firestore is the primary real-time source
  // Flutter app reads from Firestore (updated by Cloudflare Worker via MQTT in).
  // This stub exists to satisfy the provider import.
}
```

**Reason:** Direct MQTT connection phone se karna unreliable hai (battery drain, reconnection issues). Instead, Pi → HiveMQ → Cloudflare Worker → Firebase RTDB → Flutter App (via Firebase SDK onValue listeners).

---

### Flutter App Screens:

| Screen | File | Purpose |
|--------|------|---------|
| **SplashScreen** | `splash_screen.dart` | App launch animation, auto-login check |
| **AuthScreen** | `auth_screen.dart` | Clerk sign-in/sign-up (13KB — full auth flow) |
| **ProfileSetupScreen** | `profile_setup_screen.dart` | New user profile creation (emergency contacts, mode selection) |
| **PatientHomeScreen** | `patient/patient_home_screen.dart` | Main patient dashboard (25KB — massive) |
| **ChatScreen** | `patient/chat_screen.dart` | AI chatbot conversation + media sharing |
| **ECGDetailScreen** | `patient/ecg_detail_screen.dart` | Detailed ECG history view |
| **SettingsScreen** | `patient/settings_screen.dart` | Mode selection, emergency contacts, profile edit |
| **AdminHomeScreen** | `admin/admin_home_screen.dart` | Admin overview (31KB — huge) |

### Flutter Widgets:

| Widget | File | Purpose |
|--------|------|---------|
| **ECGChartWidget** | `ecg_chart_widget.dart` | FL Chart based ECG line graph |
| **BpmDisplayWidget** | `bpm_display_widget.dart` | Animated BPM number |
| **VitalsCardWidget** | `vitals_card_widget.dart` | Vital signs card (SpO2, Stress, etc.) |
| **LogoWidget** | `logo_widget.dart` | App logo display |

### State Management — Riverpod:
File: `lib/providers/sensor_providers.dart`
```dart
// Riverpod providers for reactive state management
// Yeh providers Firebase streams ko UI se connect karte hain
```

---

## 🔐 AUTHENTICATION — Clerk

### How Auth Works Across Platforms:

| Platform | Clerk Integration | How |
|----------|------------------|-----|
| **Website** | `@clerk/nextjs` package | `<ClerkProvider>` wrapper + middleware |
| **Flutter App** | Custom `ClerkAuth` mock | Simplified auth wrapper |
| **Backend** | JWT verification | `verifyClerkJWT()` — JWKS pe verify karta hai |

### Auth Flow:
```
User → Sign in with Google (or email) via Clerk
     → Clerk JWT token milta hai (contains userId in 'sub' claim)
     → Frontend: token header mein bhejta hai har API call pe
     → Backend: verifyClerkJWT() → JWKS fetch → signature verify → userId extract
     → Firebase: userId se data read/write
```

### Admin Access Control:
```
New User → signs up → role = "patient" (default)
         → requests admin access
         → admin_requests/{userId} mein entry banti hai (status: "pending")
         → Existing admin approve karta hai
         → user role "pending_admin" → "admin"
         → Audit log mein entry ban jaati hai
```

---

## 🔗 ALL EXTERNAL SERVICES & CONNECTIONS

| Service | Purpose | How Connected | Credentials |
|---------|---------|---------------|-------------|
| **Firebase RTDB** | Real-time database | REST API (backend) + Firebase SDK (frontend/mobile) | API Key + Database URL |
| **Firebase FCM** | Push notifications | REST API from Cloudflare Worker | Server Key |
| **HiveMQ Cloud** | MQTT message broker | Pi publishes, Flutter subscribes | Username/Password + TLS |
| **Cloudflare Workers** | Serverless backend | HTTPS (`api.guardianpulse.in`) | Wrangler deployment |
| **Cloudflare R2** | File/media storage | Workers binding (`MEDIA_BUCKET`) | Automatic via binding |
| **Clerk** | User authentication | SDK (frontend) + JWKS (backend) | Publishable Key + JWKS URL |
| **Gemini 1.5 Flash** | AI chatbot responses | REST API | API Key |
| **Gemini Text Embedding** | RAG vector search | REST API (text-embedding-004) | Same API Key |
| **Twilio** | SMS + Voice calls | REST API | Account SID + Auth Token + Phone |
| **Resend** | Emergency emails | REST API | API Key |
| **Google STUN** | WebRTC NAT traversal | stun:stun.l.google.com:19302 | Public (no auth needed) |
| **Vercel** | Website hosting | Git integration | Auto-deploy |

---

## 📊 FEATURE-BY-FEATURE BREAKDOWN

### 1. Live ECG Monitoring
```
Pi → AD8232 sensor → ADS1115 ADC → I2C → Python script
→ BPM detection (peak detection algorithm)
→ MQTT publish (10ms) to HiveMQ → Flutter app subscribes (optional)
→ HTTP POST (1 sec) to Cloudflare Worker → Firebase RTDB ecg_readings
→ Next.js usePatientECG() hook → Recharts line chart
→ Flutter watchEcgReadings() stream → FL Chart
```

### 2. Seizure Detection
```
ECG + Motion data → Cloudflare Worker (ecg-logic.js)
→ 3 indicators check: BPM Jump (≥30), ECG SD (>400), Motion Jerk (>2.5g)
→ Score ≥ 5/9 → SEIZURE DETECTED!
→ triggerAlert("seizure", "critical") → FCM + Timeline starts
```

### 3. Parkinson's Tremor Detection
```
MPU6050 gyroscope data → Cloudflare Worker
→ Zero-crossing frequency estimation
→ 4-6 Hz = Parkinson's resting tremor
→ 8-12 Hz = Essential tremor
→ RMS intensity threshold > 0.5
→ If parkinson mode → Alert triggered
```

### 4. Emergency Alert Escalation
```
Anomaly detected → Alert created (status: pending)
→ t=0: FCM push → Patient phone notification
→ t=2 min: Patient ne respond nahi kiya?
    → Twilio SMS → Emergency Contact 1
    → Resend Email → Emergency Contact 1 (with Google Maps link)
→ t=8 min: STILL unresolved?
    → SMS → Emergency Contact 2
    → CRITICAL email → All contacts
    → Status: "critical"
```

### 5. AI Health Chatbot
```
Patient types message
→ Flutter ApiService.sendChatMessage() → POST /chat
→ Cloudflare Worker:
    → Patient health data fetch (BPM, stress, alerts)
    → RAG: Query embedding → Cosine similarity → Top 3 medical documents
    → Gemini 1.5 Flash API call with full context
    → Response + needsSupport flag return
→ Both messages saved in chat_messages
→ Firebase triggers onValue → UI updates in real-time
```

### 6. SOS Live Camera
```
Patient triggers SOS → SOSCamera.tsx activates
→ getUserMedia() → front camera access
→ WebRTC offer → Firebase signaling (/users/{uid}/webrtc/offer)
→ Admin opens SOSCameraViewer.tsx
→ Reads offer → Creates answer → Firebase (/users/{uid}/webrtc/answer)
→ ICE candidate exchange via Firebase
→ P2P video connection established!
→ Fallback: JPEG snapshots every 5s → Firebase base64
```

### 7. Admin Approval Workflow
```
New user → requests admin access
→ admin_requests/{userId} created (status: pending)
→ Existing admin → Admin Requests page
→ Approve/Reject with reason
→ User's role field updated
→ Audit log entry created
→ Pending badge count updates in real-time (Sidebar)
```

### 8. Audit Logging
```
Admin performs any action (approve user, resolve alert, etc.)
→ audit_log/{auto_id} entry created:
    { action, performedBy, performedByName, targetUserId, details, timestamp }
→ useAuditLog() hook → Audit Log page displays chronologically
```

### 9. Media Upload (R2)
```
User picks photo/video → Flutter image_picker
→ MultipartRequest → POST /upload-media
→ Cloudflare Worker → validate type + size
→ R2 bucket: {type}/{userId}/{timestamp}-{filename}
→ Public URL returned → Displayed in chat
```

### 10. Demo Data Mode (Offline/No Hardware)
```
Patient dashboard opens → logged in user detected
→ seedDemoVitals(userId) → Baseline vitals → Firebase
→ startDemoDataSeeder(userId) → setInterval(3 seconds)
→ Simulated BPM with realistic drift → ecg_readings push
→ Admin dashboard automatically sees the same data (shared Firebase)
→ Both dashboards synchronized!
```

---

## 🎨 DESIGN SYSTEM

### Color Palette:
```
Background:        #141A14 (Deepest Dark Green)
Surface:           #1C2B1E (Dark Forest Green)
Card:              #2A3D2E (Medium Green)
Primary:           #D4B896 (Champagne Gold)
Primary Hover:     #C4A882 (Darker Gold)
Text Primary:      #F2E8D9 (Warm Cream)
Text Secondary:    #A8B5A2 (Muted Sage)
Text Muted:        #9BA897 (Light Sage)
Danger/Alert:      #E05252 (Alert Red)
Success:           #5CB85C (Green)
Border:            rgba(212, 184, 150, 0.12) (Subtle Gold)
```

### Typography:
- Font: **Inter** (Google Fonts)
- Antialiased rendering

### UI Patterns:
- **Glassmorphism:** Cards with semi-transparent backgrounds + backdrop blur
- **Ambient Mesh:** Gradient background animation
- **Page Transitions:** Blur + Fade + Slide via Framer Motion
- **Micro-animations:** Hover effects, loading skeletons, pulse indicators
- **Responsive:** Mobile-first with `md:` breakpoints

---

## 🚀 DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────┐
│                  VERCEL                          │
│  ┌─────────────────────────────────────────┐    │
│  │  Next.js Website (Admin + Patient Web)  │    │
│  │  Domain: www.guardianpulse.in           │    │
│  │  Auto-deploy from Git                   │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              CLOUDFLARE                          │
│  ┌─────────────────────────────────────────┐    │
│  │  Worker: guardian-pulse-api              │    │
│  │  Domain: api.guardianpulse.in           │    │
│  │  Cron: every minute (alert escalation)  │    │
│  ├─────────────────────────────────────────┤    │
│  │  R2 Bucket: guardian-pulse-media         │    │
│  │  (50 MB max file size, zero egress)     │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│               FIREBASE (Google)                  │
│  ┌─────────────────────────────────────────┐    │
│  │  Realtime Database (asia-southeast1)    │    │
│  │  Project: guardian-pulse-1360c           │    │
│  │  FCM: Push Notifications                │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              HIVEMQ CLOUD                        │
│  ┌─────────────────────────────────────────┐    │
│  │  MQTT Broker (TLS:8883)                 │    │
│  │  Topics: guardianpulse/ecg              │    │
│  │          guardianpulse/motion            │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## 🧮 SUMMARY — Everything Connected

```
Raspberry Pi (Python)
    │
    ├── [MQTT 10ms] → HiveMQ Broker → (Flutter App optional subscribe)
    │
    └── [HTTP 1sec] → Cloudflare Worker (JavaScript)
                          │
                          ├── ECG Analysis (ecg-logic.js)
                          │   ├── BPM Thresholds
                          │   ├── Seizure Detection
                          │   ├── Tremor Detection
                          │   ├── HRV Calculation
                          │   └── Stress Scoring
                          │
                          ├── Firebase RTDB ← Write
                          │   ├── ecg_readings
                          │   ├── motion_data
                          │   ├── alerts
                          │   └── chat_messages
                          │
                          ├── Alert Engine (alert-engine.js)
                          │   ├── FCM Push → Patient phone
                          │   ├── Twilio SMS → Emergency contacts
                          │   ├── Resend Email → Emergency contacts
                          │   └── Cron escalation (2min → 8min)
                          │
                          ├── AI Chatbot (chatbot.js)
                          │   ├── Gemini 1.5 Flash
                          │   ├── RAG (text-embedding-004)
                          │   └── Health-context personalization
                          │
                          ├── R2 Media (r2-media.js)
                          │   └── File upload/download
                          │
                          └── Auth (auth.js)
                              ├── Clerk JWT verification
                              └── Pi secret verification

Firebase RTDB ← Read (Real-time listeners)
    │
    ├── Next.js Website (TypeScript/React)
    │   ├── useAllPatients() → Patient list
    │   ├── usePatientECG() → ECG charts
    │   ├── useActiveAlerts() → Alert cards
    │   ├── useChatMessages() → Chat view
    │   ├── useSystemStats() → Dashboard stats
    │   ├── SOSCameraViewer → WebRTC video receive
    │   └── Framer Motion + Recharts + Tailwind
    │
    └── Flutter App (Dart)
        ├── DatabaseService → Profile, ECG, Alerts, Chat streams
        ├── ApiService → Cloudflare Worker API calls
        ├── AlertService → Emergency dialogs + notifications
        ├── FL Chart → ECG visualization
        ├── Riverpod → State management
        └── Hive → 30-day offline ECG cache
```

---

> **Banaya by Pranjal Mishra** — Ek complete IoT + Web + Mobile health monitoring ecosystem jo real-time mein lives save kar sakta hai. 🫀🛡️
