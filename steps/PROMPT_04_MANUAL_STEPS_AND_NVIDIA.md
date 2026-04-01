# 🔧 GUARDIAN PULSE — MANUAL STEPS + NVIDIA SETUP

### Do these BEFORE running Antigravity prompts

---

## ORDER OF EXECUTION

```
STEP 1: Manual steps in this file (browser + terminal)
STEP 2: Antigravity Session 1 → PROMPT_01_WEBSITE_NUCLEAR_REBUILD.md
STEP 3: Antigravity Session 2 → PROMPT_02_APP_NUCLEAR_REBUILD.md
STEP 4: Antigravity Session 3 → PROMPT_03_BACKEND_NUCLEAR_FIX.md
STEP 5: Deploy all three
```

---

## MANUAL STEP 1 — Get NVIDIA API Key (5 min)

1. Go to: https://build.nvidia.com/
2. Click "Get API Key" or "Sign Up"
3. Use your Google account to sign in
4. Dashboard → "API Keys" → "Generate Key"
5. Copy the key (starts with `nvapi-...`)
6. Save it — you'll add to .env.local AND wrangler secrets

```bash
# Add to Cloudflare Worker
cd "C:\Users\pranj\OneDrive\Documents\CODING\GUARDIAN PULSE\backend"
wrangler secret put NVIDIA_API_KEY
# paste your nvapi-xxx key

# Best free NVIDIA models to use:
# mistralai/mistral-7b-instruct-v0.3  (fast, medical-friendly)
# meta/llama-3.1-8b-instruct          (excellent for health Q&A)
# microsoft/phi-3-mini-128k-instruct  (small but smart)
```

---

## MANUAL STEP 2 — Firebase Realtime Database Rules (3 min)

Go to: https://console.firebase.google.com/
→ Guardian Pulse → Realtime Database → Rules

Paste this EXACTLY:

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "ecg_readings": {
      ".indexOn": ["userId", "timestamp", "isAnomaly"]
    },
    "motion_data": {
      ".indexOn": ["userId", "timestamp"]
    },
    "alerts": {
      ".indexOn": ["userId", "status", "createdAt"]
    },
    "chat_messages": {
      ".indexOn": ["userId", "timestamp", "needsSupport"]
    },
    "users": {
      ".indexOn": ["role", "email"]
    }
  }
}
```

Click Publish.

---

## MANUAL STEP 3 — Add pranjal_001 to Firebase (2 min)

Firebase Console → Realtime Database → Data tab
Click the "+" button at root level

Add this structure:

```
users
  └── pranjal_001
        name: "Pranjal Mishra"
        email: "pranjalmishra2409@gmail.com"
        role: "patient"
        mode: "normal"
        phone: "+91-9999999999"
        emergencyContact1Name: "Emergency Contact"
        emergencyContact1Phone: "+91-9999999998"
        emergencyContact1Email: "emergency@gmail.com"
        createdAt: "2026-03-25T00:00:00Z"
```

This ensures Pi's data (userId: pranjal_001) shows up in the dashboard.

---

## MANUAL STEP 4 — Clerk Google OAuth Setup (5 min)

Go to: https://dashboard.clerk.com
→ Guardian Pulse → Configure → SSO Connections → Google

1. Enable "Google" toggle → ON
2. You'll need Google OAuth credentials:
   - Go to: https://console.cloud.google.com
   - APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     https://allowing-cub-75.clerk.accounts.dev/v1/oauth_callback
   - Copy Client ID and Client Secret
3. Paste into Clerk's Google OAuth fields
4. Save

Also in Clerk → Configure → Email, Phone, Username:

- Phone Number: OFF
- Username: OFF
- Email: ON (required)

---

## MANUAL STEP 5 — Delete Broken NDK (Android Studio fix)

Open CMD as Administrator:

```cmd
rmdir /s /q "C:\Users\pranj\AppData\Local\Android\sdk\ndk\26.1.10909125"
rmdir /s /q "C:\Users\pranj\AppData\Local\Android\sdk\ndk\27.0.12077973"
```

Then install correct NDK in Android Studio:
SDK Manager → SDK Tools → NDK (Side by side)
Check version "25.1.8937393" → Apply → OK

---

## MANUAL STEP 6 — Download google-services.json

Firebase Console → Guardian Pulse → Project Settings
→ Android app section → Download google-services.json
→ Place in: app/android/app/google-services.json

---

## MANUAL STEP 7 — Vercel Environment Variables

Go to: https://vercel.com/pranjal240s-projects/guardian-pulse/settings/environment-variables

Add/Update these (ALL environments — Production + Preview + Development):

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  = pk_test_YWxsb3dpbmctY3ViLTc1LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY                   = <CLERK_SECRET_KEY>
NEXT_PUBLIC_FIREBASE_API_KEY       = <FIREBASE_API_KEY>
NEXT_PUBLIC_FIREBASE_DB_URL        = <FIREBASE_DB_URL>
NEXT_PUBLIC_FIREBASE_PROJECT_ID    = <FIREBASE_PROJECT_ID>
NEXT_PUBLIC_FIREBASE_APP_ID        = <FIREBASE_APP_ID>
NEXT_PUBLIC_CLOUDFLARE_API         = <CLOUDFLARE_API_URL>
GEMINI_API_KEY                     = <GEMINI_API_KEY>
NVIDIA_API_KEY                     = <NVIDIA_API_KEY>
RESEND_API_KEY                     = <RESEND_API_KEY>
TWILIO_ACCOUNT_SID                 = <TWILIO_ACCOUNT_SID>
TWILIO_AUTH_TOKEN                  = <TWILIO_AUTH_TOKEN>
TWILIO_PHONE                       = <TWILIO_PHONE>
GROQ_API_KEY                       = <GROQ_API_KEY>
```

After adding all: click Save → then redeploy:

```bash
cd "C:\Users\pranj\OneDrive\Documents\CODING\GUARDIAN PULSE\website"
npx vercel deploy --prod
```

---

## MANUAL STEP 8 — Resend Domain Verification (5 min)

Go to: https://resend.com/domains
→ Add Domain → guardianpulse.in

You'll get DNS records. Add them in GoDaddy:
DNS → Manage → Add Record for each one Resend gives you.

This makes emails come from: alerts@guardianpulse.in (professional)

---

## MANUAL STEP 9 — Pi Script Update

After backend is redeployed, update Pi script:

```bash
ssh nihal9@Nihal
cd ~/guardian-pulse
nano e.py
```

Make sure these values are set (fill with your real values):

```python
CLOUDFLARE_URL = "<CLOUDFLARE_SENSOR_URL>"  # e.g., https://guardian-pulse-api.example.workers.dev/sensor-data
PI_SECRET = "<PI_SECRET>"
USER_ID = "<PI_USER_ID>"
MQTT_HOST = "<MQTT_HOST>"
MQTT_PORT = 8883
MQTT_USER = "<MQTT_USER>"
MQTT_PASS = "<MQTT_PASS>"
```

Run:

```bash
python3 e.py
```

Check Firebase Console → Realtime Database → ecg_readings → data should appear!

---

## MANUAL STEP 10 — Flutter App Build (After Antigravity generates files)

```bash
# Delete broken NDK first (from Step 5)
# Then:
cd "C:\Users\pranj\OneDrive\Documents\CODING\GUARDIAN PULSE\app"
flutter clean
flutter pub get
flutter analyze  # should show 0 errors
flutter run      # or flutter run -d chrome for instant test
```

For APK:

```bash
flutter build apk --release
# APK at: build/app/outputs/flutter-apk/app-release.apk
```

---

## VERIFICATION CHECKLIST

After all steps, verify:

```
□ Firebase RTDB rules published (indexes set)
□ pranjal_001 user profile exists in Firebase
□ Pi script running → data in Firebase ecg_readings
□ Cloudflare: curl test returns {"success":true}
□ Website: www.guardianpulse.in loads with olive UI
□ Website: Google login button visible on landing page
□ Website: ECG Monitor shows pranjal_001 card
□ Flutter: flutter run shows splash screen
□ Flutter: Login screen has role selector
□ Flutter: Home screen shows live BPM from Firebase
□ Resend: email domain verified
□ Twilio: test SMS sends successfully
```

---

## QUICK DEBUG COMMANDS

```bash
# Test Cloudflare backend
curl -X POST https://guardian-pulse-api.pranjalmishra2409.workers.dev/sensor-data \
  -H "Content-Type: application/json" \
  -H "X-Pi-Secret: <PI_SECRET>" \
  -d "{\"topic\":\"guardianpulse/ecg\",\"payload\":{\"userId\":\"pranjal_001\",\"bpm\":75,\"rawValue\":15000,\"rrInterval\":800,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}"

# Watch Cloudflare logs live
cd backend && wrangler tail

# Test email via Resend
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer <RESEND_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"from":"alerts@guardianpulse.in","to":["pranjalmishra2409@gmail.com"],"subject":"Test","html":"<p>Test email from Guardian Pulse</p>"}'

# Test Twilio SMS
curl -X POST https://api.twilio.com/2010-04-01/Accounts/<TWILIO_ACCOUNT_SID>/Messages.json \
  -u <TWILIO_ACCOUNT_SID>:<TWILIO_AUTH_TOKEN> \
  --data-urlencode "Body=TEST: Guardian Pulse SMS working!" \
  --data-urlencode "From=<TWILIO_PHONE>" \
  --data-urlencode "To=+91XXXXXXXXXX"

# Test AI chat
curl -X POST https://guardian-pulse-api.pranjalmishra2409.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"pranjal_001","message":"What does high BPM mean?","history":[]}'
```

---

## NVIDIA MODELS TO USE (from build.nvidia.com)

Best for Guardian Pulse medical use case:

```
1. mistralai/mistral-7b-instruct-v0.3
   → Best for concise medical Q&A
   → Base URL: https://integrate.api.nvidia.com/v1

2. meta/llama-3.1-8b-instruct
   → Best for longer explanations

3. microsoft/phi-3-mini-128k-instruct
   → Smallest, fastest, still good for health tips

Usage:
  fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer nvapi-xxx',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct-v0.3',
      messages: [...],
      max_tokens: 300,
      temperature: 0.4,
    })
  })
```

---

## PROJECT STATUS AFTER ALL STEPS

```
Pipeline:
Pi Sensor → HiveMQ MQTT → Cloudflare Worker → Firebase RTDB
                                 ↓
                        Analysis (ECG, Seizure, Tremor)
                                 ↓
                    Firebase RTDB (ecg_readings, alerts, chat)
                                 ↓
                    Next.js Website ← Flutter App
                         ↓                  ↓
                   Admin Dashboard    Patient Monitor
                         ↓
               Resend Email + Twilio SMS + Voice Call

AI Stack:
  GROQ (primary, fast) → Gemini (fallback) → Static response (last resort)

Data Sources:
  Firebase RTDB: ECG, motion, alerts, chat, users
  Disease.sh: public health benchmarks (free API)
  OpenFDA: medication data (free API)
  NVIDIA NIM: enhanced AI inference (paid but has free tier)
```
