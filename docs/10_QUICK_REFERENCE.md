# 📋 FILE 10 — QUICK REFERENCE CHEAT SHEET
### Guardian Pulse | Sab kuch ek jagah

---

## FINAL TECH STACK SUMMARY

```
AUTH:        Clerk          → clerk.com
DATABASE:    Firebase       → firebase.google.com  
STORAGE:     Cloudflare R2   → Free 10GB, zero egress
NOTIF:       Firebase FCM   → (same project)
BACKEND:     Cloudflare     → cloudflare.com/workers
EMAILS:      Resend         → resend.com
SMS/CALLS:   Twilio         → twilio.com
MQTT:        HiveMQ Cloud   → console.hivemq.cloud
APP:         Flutter        → Antigravity
WEBSITE:     Next.js        → Antigravity → Vercel
DOMAIN:      GoDaddy        → guardianpulse.in
AI:          Gemini Flash   → aistudio.google.com
```

---

## URLS

| URL | Kya hai |
|-----|---------|
| `www.guardianpulse.in` | Admin website (doctors/admins ke liye) |
| `api.guardianpulse.in` | Cloudflare backend API |
| `guardianpulse.in/privacy` | Privacy policy page |

---

## IMPORTANT COMMANDS

```bash
# Backend deploy
cd guardian-pulse-backend && wrangler deploy

# Backend logs live
wrangler tail

# Website deploy (automatic via GitHub → Vercel)
git push

# Flutter APK build
flutter build apk --release

# Pi script chalaao
python3 sensor_publisher.py

# RAG docs process karo (ek baar)
node process-rag-docs.js
```

---

## MQTT TOPICS

| Topic | Direction | Data |
|-------|-----------|------|
| `guardianpulse/ecg` | Pi → HiveMQ → Cloudflare | BPM, raw ECG |
| `guardianpulse/motion` | Pi → HiveMQ → Cloudflare | Accel, gyro |

---

## FIREBASE COLLECTIONS

| Collection | Stores |
|------------|--------|
| `users` | Patient profiles, settings, mode |
| `ecg_readings` | All ECG data points |
| `motion_data` | MPU6050 sensor data |
| `alerts` | Emergency alert records + timeline |
| `chat_messages` | AI + support chat history |
| `rag_documents` | Medical knowledge base chunks |

---

## BPM THRESHOLDS

| BPM Value | Status | Action |
|-----------|--------|--------|
| 60 - 100 | ✅ Normal | Kuch nahi |
| 50 - 59 | ⚠️ Warning | Yellow alert |
| 100 - 130 | ⚠️ Warning | Yellow alert |
| < 50 or > 130 | 🔴 Alert | Emergency flow shuru |
| < 40 or > 180 | 🚨 Emergency | Ambulance direct |

---

## ALERT STATUS FLOW

```
pending
  → user responded: "I'm Okay" → RESOLVED ✅
  → 2 min, no response → contact_notified
      → 8 min, no response → ambulance_called 🚨
      → contact responded, user still no response → ambulance_called 🚨
```

---

## TREMOR FREQUENCY

| Hz | Matlab |
|----|--------|
| 0-2 | Normal movement |
| 4-6 | Parkinson's tremor |
| 8-12 | Anxiety/panic |
| >12 | Seizure artifact |

---

## IMPORTANT LINKS

- Clerk docs: docs.clerk.com
- Firebase docs: firebase.google.com/docs
- Cloudflare Workers: developers.cloudflare.com/workers
- Resend docs: resend.com/docs
- Gemini API: ai.google.dev/docs
- HiveMQ docs: docs.hivemq.com
- Flutter MQTT: pub.dev/packages/mqtt_client
