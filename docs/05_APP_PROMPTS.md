# 📱 FILE 05 — FLUTTER APP PROMPTS (ANTIGRAVITY BUILDS EVERYTHING)
### Guardian Pulse Mobile App | Hinglish Guide

> ✅ **Use FINAL_ANTIGRAVITY_APP_PROMPTS.md for the definitive, updated prompts.**
> This file is kept as reference. The new file (F1-F9) has exact credentials, Riverpod providers, and R2 upload — use that.

---

## SHURU KARNE SE PEHLE — Antigravity mein context set karo

**Har session start mein ye paste karo:**
```
I am building Guardian Pulse — a medical monitoring Flutter app.
Colors: Primary #2D4A3E (dark olive), Accent #C4A882 (warm sand), 
Background #1A2E1F (very dark forest green), Text #F5EDD6 (cream).
Font: Poppins.
Auth: Clerk Flutter SDK.
Database: Firebase Firestore (real-time onSnapshot).
File Uploads: Cloudflare R2 via POST /upload-media (NOT Firebase Storage).
Backend API: https://api.guardianpulse.in (Cloudflare Workers).
State management: Riverpod StreamProviders watching Firestore.
```

---

## PROMPT 1 — pubspec.yaml + Project Setup

```
Create the pubspec.yaml for Guardian Pulse Flutter app with these dependencies:

clerk_flutter: ^2.0.0            # Authentication
firebase_core: ^2.24.2           # Firebase base
cloud_firestore: ^4.14.0         # Database + real-time
firebase_messaging: ^14.7.10     # Push notifications
# NOTE: firebase_storage REMOVED — using Cloudflare R2 instead
mqtt_client: ^10.0.0             # HiveMQ real-time data
riverpod: ^2.4.9                 # State management
flutter_riverpod: ^2.4.9
fl_chart: ^0.66.2                # ECG graph
geolocator: ^11.0.0              # GPS tracking
flutter_local_notifications: ^17.0.0  # Local alerts
video_player: ^2.8.1             # Symptom videos
hive_flutter: ^1.1.0             # Local 30-day storage
http: ^1.1.0                     # API calls + R2 upload
image_picker: ^1.0.7             # Chat image/video
permission_handler: ^11.3.0
flutter_secure_storage: ^9.0.0   # Secure token storage

App name: Guardian Pulse
Package: com.guardianpulse.app
Min SDK Android: 21
iOS deployment target: 14.0

Also show main.dart that initializes:
1. Firebase (await Firebase.initializeApp)
2. Clerk (ClerkFlutter.init with publishable key)
3. Hive for local storage
4. Riverpod ProviderScope wrapper
```

---

## PROMPT 2 — Splash + Home Screen

```
Create the complete Home Screen for Guardian Pulse Flutter app.

SPLASH SCREEN (3 seconds, then auto-navigate):
- Black background
- Animated ECG heartbeat line drawing itself across screen (custom painter)
- "Guardian Pulse" text fades in — olive green color
- Tagline: "Your Life. Monitored." — cream colored, smaller
- Smooth fade transition to Home

HOME SCREEN LAYOUT (dark forest green background #1A2E1F):

TOP STATUS BAR (always visible, like a header card):
- Left: Connection dot (green = Pi connected, red = disconnected)
- Center: "● LIVE" pulsing text in sand color
- Right: Current BPM in large font (green if normal, yellow if warning, red if critical)
- Updates every 1 second from Riverpod state

SECTION 1 — VIDEO CAROUSEL:
- Horizontal PageView with 5 video cards
- Each card full-width, 220px height, rounded corners
- Video plays silently on loop (video_player)
- Gradient overlay (dark bottom) with title text
- Card titles: "Heart Attack", "Panic Attack", "Seizure Disorder", "Parkinson's Disease", "PTSD Episode"
- Videos from assets/videos/ folder
- Smooth page indicator dots below

SECTION 2 — LIVE ECG PREVIEW:
- Title: "Live ECG Monitor" with small green pulsing dot
- fl_chart LineChart, last 60 data points
- Sand colored (#C4A882) line on dark background
- Tap anywhere on chart → navigate to Full ECG Screen
- Shows "Not Connected" placeholder if no data

SECTION 3 — VITALS ROW (4 cards horizontal):
- Card 1: BPM (large number, color coded)
- Card 2: Stress Level (0-100 with arc gauge)
- Card 3: Tremor (● Normal / ● Detected)
- Card 4: Mode (Normal/Sleep/Parkinson badge)

SECTION 4 — RECENT ALERTS (last 3):
- Each item: alert type icon + description + time ago
- Tap → goes to alert detail

BOTTOM NAVIGATION:
- Home | ECG | Chat | Settings
- Sand colored active indicator
- Smooth transition between tabs

All data comes from Riverpod providers watching Firestore streams.
Show skeleton loaders while data loads.
```

---

## PROMPT 3 — Full ECG Detail Screen

```
Create the ECG Detail Screen for Guardian Pulse Flutter app.

HEADER:
- Back button + "ECG Monitor" title + Export PDF button (top right)

MAIN CHART (top 45% of screen):
- fl_chart LineChart — interactive
- ECG line color: green (normal BPM), yellow (warning), red (critical)
- Animated: new data scrolls in from right every second
- Tap/long press on point → shows tooltip with exact value + timestamp
- Y-axis: ECG amplitude (mV)
- X-axis: Time

TIME RANGE TOGGLE (below chart):
- Segmented control: "LIVE" | "1H" | "24H" | "7D" | "30D"
- LIVE: real-time Firestore stream
- Others: query Firestore with date filter, show as line chart
- 30D: show daily BPM average as bar chart overlaid

ANALYSIS PANEL:
- Current BPM: large number with trend arrow (↑↓→)
- Average BPM (selected period)
- Min / Max BPM
- HRV Score (number + label: Poor/Fair/Good/Excellent)
- Rhythm status: "Normal Sinus Rhythm" / "Tachycardia" / "Bradycardia" / "Irregular"
- Stress Level: 0-100 with color gradient bar

"AI ANALYSIS" BUTTON:
- Sends last 24h summary to https://api.guardianpulse.in/chat
- System prompt: analyze this ECG data in simple language
- Shows bottom sheet with AI explanation in plain Hinglish/English
- Loading indicator while waiting

EPISODE LOG (bottom scrollable):
- List of detected anomalies in selected time range
- Each: timestamp + type + duration + severity badge
```

---

## PROMPT 4 — Emergency Alert System

```
Create the complete Emergency Alert System for Guardian Pulse Flutter app.

CREATE AlertService class (lib/services/alert_service.dart):

BACKGROUND MONITORING:
- Use firebase_messaging onMessage handler to receive alerts from backend
- When alert received, show full-screen AlertDialog immediately

FULL-SCREEN ALERT DIALOG (cannot be dismissed by tapping outside):
- Red pulsing border animation
- Large warning icon (animated)
- Title: "⚠️ Unusual Activity Detected"
- Detected condition: e.g., "Possible Seizure Detected" 
- Circular countdown timer: 2 minutes, ticking live
- Large green button: "I'M OKAY" (tall, full width)
- Small text below: "Not responding? Emergency contacts will be notified."

ON "I'M OKAY" TAP:
- POST to https://api.guardianpulse.in/resolve-alert with alertId
- Dialog closes
- Small success snackbar: "✓ Alert dismissed. Stay safe!"

ON TIMEOUT (2 minutes, no response):
- Dialog changes to: "Notifying emergency contacts..."
- Show names of contacts being notified
- Start second countdown: 8 minutes remaining
- User can still tap "I'M OKAY" to stop escalation

ON SECOND TIMEOUT (8 minutes total):
- Dialog: "Calling emergency services..."
- Show location being shared
- Cannot be dismissed

LOCATION TRACKING DURING ALERT:
- geolocator: startLocationUpdates every 30 seconds
- Store each location update via POST to backend
- Stop tracking when alert resolved

NOTIFICATION TYPES (different icons/colors):
- 🔴 Cardiac Emergency: red
- 🟠 Seizure: orange  
- 🟡 Panic Attack: yellow
- 🔵 Parkinson Episode: blue
- ⚪ PTSD: gray
```

---

## PROMPT 5 — Chat Screen (AI + Support)

```
Create the Chat Screen for Guardian Pulse Flutter app.

TWO TABS at top:
- "AI Assistant" (default) | "Live Support"

AI ASSISTANT TAB:
HEADER CARD (collapsible):
- Today's health summary: BPM average, stress level, any alerts
- "Based on today's data" label

CHAT LIST:
- WhatsApp-style bubbles
- AI messages: left, dark olive background #2D4A3E, cream text
- User messages: right, sand background #C4A882, dark text
- Message timestamps below each bubble
- AI name: "Guardian AI 🫀"
- Show typing indicator (3 animated dots) while API responds

MESSAGE INPUT BAR:
- Text field with "Ask about your health..." hint
- Gallery icon → image_picker → upload to Firebase Storage → send URL in message
- Camera icon → direct camera capture
- Send button (olive colored)
- Sends to POST https://api.guardianpulse.in/chat

ON IMAGE/VIDEO SEND:
- Show upload progress in chat bubble
- After upload: show thumbnail in bubble  
- POST multipart/form-data to https://api.guardianpulse.in/upload-media
- Backend uploads to Cloudflare R2 → returns publicUrl
- Send publicUrl in chat message to /chat endpoint
- (NOT Firebase Storage — that is removed)

LIVE SUPPORT TAB:
- Same UI as AI tab
- Shows conversation with human support agent
- When no agent: "AI is assisting. A support agent will join shortly."
- Real-time via Firestore stream (chat_messages collection, sender: 'support')
- "Connect to Support" button at top → sets needsSupport: true in Firestore
```

---

## PROMPT 6 — Settings Screen

```
Create Settings Screen for Guardian Pulse Flutter app.

All changes save to:
1. Firebase Firestore (users collection — syncs to admin website)
2. Locally via Hive (works offline)

PROFILE SECTION:
- Avatar (circular, tap to change from gallery → upload to Firebase Storage)
- Name, Phone, Email (editable text fields)
- "Save Profile" button → updates Firestore

EMERGENCY CONTACTS:
- Contact 1: Name + Phone + Email (required fields)
- Contact 2: Name + Phone (optional)
- "Send Test Alert" button → sends test SMS/email → shows confirmation

MONITORING MODE (prominent section):
Three option cards with icons:
- 🟢 Normal Mode: standard thresholds, description below
- 🌙 Sleep Mode: wider thresholds, silent alerts only, no vibration
- 🧠 Parkinson Mode: enhanced sensitivity, tremor logging, frequent check-ins
→ Selecting any saves to Firestore immediately → backend reads this mode

ALERT SETTINGS:
- Toggle: Each alert type (Seizure, Panic, PTSD, Cardiac, Parkinson)
- Alert sensitivity slider: Low / Medium / High (3 positions)
- Emergency call option: Enable/disable ambulance calling

DEVICE STATUS:
- Raspberry Pi connection status (live, from MQTT state)
- HiveMQ connection status
- Last data received: "2 minutes ago" or "Just now"
- Reconnect button

PARKINSON MODE (special section, visible only in Parkinson mode):
- Medication reminders: add time slots with notification
- Tremor logging: enable/disable detailed logging
- Doctor export: generate PDF report for doctor visits
- QTc monitoring: male/female toggle (different safe thresholds)

PRIVACY:
- Export my data (generates and downloads JSON)
- Delete history (last 30 days motion/ECG data)
- Privacy Policy link → opens guardianpulse.in/privacy
```

---

## PROMPT 7 — Clerk Authentication Screens

```
Create Authentication flow for Guardian Pulse using Clerk Flutter SDK.

FLOW:
App launch → Check if Clerk session exists
  YES → Go to Home Screen
  NO  → Show Auth Screen

AUTH SCREEN:
- Full screen, dark background
- Guardian Pulse logo + name at top
- Tagline: "Medical monitoring for those who care"
- 
- "Continue with Google" button (sand color, Google icon)
  → Uses Clerk's Google OAuth
- Divider: "or"
- Email input field
- "Continue with Email" button
  → Clerk sends OTP to email
  → OTP input screen (6 digit, auto-focus)
  → On verify → home screen

AFTER FIRST LOGIN:
- "Complete Your Profile" screen:
  - Name (required)
  - Phone number (required — for emergency SMS)
  - Emergency Contact 1: Name + Phone + Email (required)
  - Emergency Contact 2: Name + Phone (optional)
  - "I agree to allow emergency services to be contacted on my behalf" checkbox (required)
  - "Get Started" → saves to Firestore → home screen

CLERK SETUP:
Use ClerkProvider wrapping entire app in main.dart.
publishableKey: 'YOUR_CLERK_PUBLISHABLE_KEY'
After auth, get Clerk session token:
  final token = await Clerk.shared.session?.getToken();
Send this token in every API call:
  headers: {'Authorization': 'Bearer $token'}
```
