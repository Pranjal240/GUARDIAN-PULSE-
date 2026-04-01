# ⚡ FILE 09 — 24-GHANTE KA BATTLE PLAN
### Hackathon Execution Guide | Guardian Pulse | Hinglish

---

## KON SA AGENT KAISE USE KARO

| Agent | Kab use karo | Kya dena hai |
|-------|-------------|-------------|
| **Antigravity** | ✅ SAB KUCH — Backend, Flutter, Website, Pi code | Sab files yahan already bane hue hain |
| **Gemini API** | Runtime chatbot responses | Worker automatically call karta hai |

> **Note:** Previously Copilot aur VS Code ka plan tha. Ab **sab kuch Antigravity (ye same session)** mein ho raha hai. Backend code already generate ho chuka hai. Flutter prompts `FINAL_ANTIGRAVITY_APP_PROMPTS.md` mein hain.

---

## GHANTA-BY-GHANTA SCHEDULE (UPDATED)

### ⏰ GHANTA 0-1: FOUNDATION (Seedha karo pehle — Browser mein)
```
MANUALLY karo (browser mein):
□ guardianpulse.in kharido GoDaddy pe (15 min)
□ Clerk account banao, app create karo (10 min)
□ Firebase project banao, Firestore + FCM enable karo (20 min)
□ Cloudflare account banao, R2 bucket "guardian-pulse-media" banao (10 min)
□ Vercel account banao (5 min)
□ HiveMQ credentials note karo (5 min)
□ Sab keys steps/keys.env mein save karo (5 min)
```

### ⏰ GHANTA 1-2: BACKEND DEPLOY (Antigravity already ban chuka hai)
```
Antigravity + Terminal:
□ backend/ folder mein ja: cd backend
□ npm install
□ wrangler login (browser mein Cloudflare login)
□ Secrets set karo (wrangler secret put commands — File 04 dekho)
□ wrangler deploy
□ curl se test karo (File 04 mein commands hain)
□ Custom domain: api.guardianpulse.in → Worker pe point karo
```

### ⏰ GHANTA 2-3: RASPBERRY PI
```
Antigravity + Terminal (SSH into Pi):
□ raspberry-pi/ folder already bana hua hai
□ sensor_publisher.py Pi pe copy karo (scp ya USB)
□ .env file banao Pi pe (HiveMQ credentials)
□ pip install paho-mqtt mcp3008 smbus2 python-dotenv
□ python3 sensor_publisher.py chalao — HiveMQ console mein data check karo
□ HiveMQ Webhook → api.guardianpulse.in/sensor-data pe set karo
```

### ⏰ GHANTA 3-8: FLUTTER APP (Antigravity — FINAL_ANTIGRAVITY_APP_PROMPTS.md)
```
Antigravity session mein — ek-ek prompt do in order:
□ F1: pubspec.yaml + main.dart setup
□ F2: Firestore data providers (Riverpod StreamProviders)
□ F3: Splash + Auth screen (Clerk Google + OTP)
□ F4: Profile Setup screen
□ F5: Home screen (live ECG + vitals + video carousel)
□ F6: ECG Detail screen (full chart + AI analysis)
□ F7: Alert system service (FCM + countdown dialog)
□ F8: Chat screen (AI + live support + R2 uploads)
□ F9: Settings screen (monitoring mode + Parkinson extras)
□ flutter run — test on device
```

### ⏰ GHANTA 8-12: NEXT.JS WEBSITE (Antigravity — File 06 prompts)
```
New Antigravity session (or continue same):
□ Prompt W1: Next.js setup + ClerkProvider + dark layout
□ Prompt W2: Admin Dashboard overview page
□ Prompt W3: ECG Monitor patient grid page
□ Prompt W4: Alerts management page
□ Prompt W5: Support chat page (WhatsApp style)
□ Prompt W6: Framer Motion animations

Deploy:
□ npm run build — check no errors
□ vercel deploy (CLI — no GitHub needed)
□ www.guardianpulse.in website pe point karo
```

### ⏰ GHANTA 12-14: CONNECT + TEST
```
□ Flutter app mein check karo: Pi data → Firestore → App mein dikhe
□ Anomaly simulate karo → Alert aaye → 2 min baad SMS → 8 min baad critical
□ Admin website pe patient cards real-time update ho
□ Chat: AI response aaye + media upload R2 pe
□ Support tab: Admin website pe message dikhe
```

### ⏰ GHANTA 14-16: AI CHATBOT RAG SETUP
```
□ 3-4 medical PDFs download karo:
   - WHO Cardiovascular risk guidelines
   - Parkinson's disease patient guide
   - Seizure first aid guidelines
□ backend/process-rag-docs.js chalao: node process-rag-docs.js
□ Firestore rag_documents mein embeddings aa jaenge
□ Chat mein test: "Mera BPM high hai, kya karna chahiye?"
```

### ⏰ GHANTA 16-18: ALERTS TEST
```
□ Resend: ek test email bhejo apne aap ko
□ Twilio: free trial pe SMS test karo
□ Full flow: BPM 200 set karo (fake payload) → Alert → 2 min → SMS
□ Location tracking: Alert ke time map link email mein aaye
```

### ⏰ GHANTA 18-20: DOMAIN + FINAL DEPLOY
```
□ GoDaddy → DNS settings → Vercel ke A records add karo
□ www.guardianpulse.in → Vercel website
□ api.guardianpulse.in → Cloudflare Worker (already done)
□ flutter build apk --release → APK ready
```

### ⏰ GHANTA 20-22: POLISH + DEMO PREP
```
□ Loading states missing? Fix karo
□ App screenshots lo presentation ke liye
□ 2-minute demo video banao:
   1. Pi data live aa raha hai → ECG graph real-time
   2. Alert simulate karo → escalation timeline
   3. Admin website live data
   4. AI chatbot personalized response
□ README.md hackathon submission ke liye
```

---

## 🚨 CHEEZ KAAM NA KARE — QUICK FIX

| Problem | Fix |
|---------|-----|
| HiveMQ data nahi aa raha | Pi WiFi check karo, port 8883 verify karo |
| Cloudflare error | `wrangler tail` se logs dekho |
| Firebase connection fail | google-services.json sahi jagah? FirebaseOptions correct? |
| Flutter build error | `flutter pub get` chalao |
| Domain kaam nahi kar raha | DNS 30 min lag sakta hai, wait karo |
| Auth nahi ho raha | Clerk publishable key double-check karo |
| R2 upload kaam nahi karna | R2_PUBLIC_URL env var set hai wrangler mein? |

---

## 🎤 JUDGES KO DEMO KAISE DO

```
"Guardian Pulse ek real-time medical monitoring system hai jo 
cardiac, neurological, aur movement disorders detect karta hai."

1. Pi chala ke dikhao → app mein live ECG aata hai (30 sec)

2. "Alert system: Anomaly detect hone pe patient ko pehle poochha jata hai.
   2 minute mein respond na kare toh emergency contact,
   8 minute mein ambulance."

3. Alert simulate karo → escalation live dikhao

4. Admin website → patient grid → live ECG cards

5. Parkinson Mode → tremor frequency graph

6. AI Chatbot → "Mera BPM zyada hai, kya karna chahiye?" → personalized answer

"Ye just a demo nahi hai — ye live chal raha hai pura ecosystem."
```
