# 🚀 FINAL EXECUTION PLAN — ANTIGRAVITY MASTER PROMPT
### Paste karo Antigravity mein SABSE PEHLE — Har session start mein

---

## ⚡ CONTEXT PRIMER — HAR SESSION SHURU MEIN YE PASTE KARO

```
I am building GUARDIAN PULSE — a real-time medical monitoring system.

=== CORE DATA FLOW (NEVER CHANGE THIS) ===
Raspberry Pi 4B (ECG + MPU6050 sensors)
  → publishes MQTT to HiveMQ Cloud every 1 second
  → HiveMQ Webhook forwards to Cloudflare Worker API
  → Cloudflare processes + saves to Firebase Firestore
  → Flutter app reads from Firebase Firestore (real-time onSnapshot)
  → Next.js website reads from Firebase Firestore (real-time onSnapshot)

ALL live data in app and website comes from Firebase Firestore.
The app NEVER connects directly to HiveMQ or Cloudflare.
The app ONLY reads Firestore + calls Cloudflare API for actions.

=== CREDENTIALS (use exactly these) ===
Firebase Project ID: guardian-pulse-1360c
Firebase API Key: AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc
Firebase App ID: 1:1058794098347:web:e358b1e45760d97127b1ee
Firebase Measurement ID: G-6FHJC9ZZ2C
FCM Sender ID: 1058794098347

Clerk Publishable Key: pk_test_YWxsb3dpbmctY3ViLTc1LmNsZXJrLmFjY291bnRzLmRldiQ

Cloudflare API Base URL: https://api.guardianpulse.in
HiveMQ Host: 7445d8adef514837a806d00ac60a1255.s1.eu.hivemq.cloud (port 8883 SSL)
Media Upload: Cloudflare R2 via POST /upload-media

=== APP DESIGN SYSTEM ===
Framework: Flutter (Android + iOS)
State: Riverpod
Colors: Background #1A2E1F, Cards #2D4A3E, Accent #C4A882, Text #F5EDD6
Font: Poppins
Auth: Clerk Flutter SDK
Database reads: Firebase Firestore (cloud_firestore package)
Push notifications: Firebase FCM (firebase_messaging)
Local storage: Hive (30-day offline ECG cache)
Charts: fl_chart
GPS: geolocator

=== WEBSITE DESIGN SYSTEM ===
Framework: Next.js 14 App Router
Colors: Background #1A2E1F, Cards #2D4A3E, Accent #C4A882, Text #F5EDD6
Font: Inter
Auth: Clerk Next.js SDK
Animations: Framer Motion
Charts: Recharts
Deploy: Vercel CLI (no GitHub)

=== FIREBASE COLLECTIONS ===
users/{userId}: name, phone, emergencyContact1, emergencyContact2, emergencyEmail, mode, deviceId
ecg_readings/{id}: userId, bpm, rawValue, isAnomaly, anomalyType, timestamp
motion_data/{id}: userId, accelX, accelY, accelZ, gyroX, gyroY, gyroZ, tremorDetected, tremorFrequency, stressLevel, timestamp
alerts/{id}: userId, alertType, status, lat, lng, createdAt, resolvedAt, timeline[]
chat_messages/{id}: userId, message, sender, mediaUrl, needsSupport, timestamp
rag_documents/{id}: sourceFile, chunkText, embedding[], createdAt

All live data updates come via Firestore onSnapshot listeners.
Never use polling or manual refresh for live data.
```

---

## 📱 FLUTTER APP — FINAL PROMPTS (Antigravity mein ek-ek do)

### PROMPT F1 — Project Setup

```
Using the context I provided, create Guardian Pulse Flutter project setup:

pubspec.yaml with ALL these dependencies (exact versions):
  clerk_flutter: ^2.0.0
  firebase_core: ^2.24.2
  cloud_firestore: ^4.14.0
  firebase_messaging: ^14.7.10
  mqtt_client: ^10.0.0
  flutter_riverpod: ^2.4.9
  riverpod: ^2.4.9
  fl_chart: ^0.66.2
  geolocator: ^11.0.0
  flutter_local_notifications: ^17.0.0
  video_player: ^2.8.1
  hive_flutter: ^1.1.0
  http: ^1.1.0
  image_picker: ^1.0.7
  permission_handler: ^11.3.0
  flutter_secure_storage: ^9.0.0

assets:
  - assets/videos/

main.dart that:
1. Initializes Firebase with:
   projectId: 'guardian-pulse-1360c'
   apiKey: 'AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc'
   appId: '1:1058794098347:web:e358b1e45760d97127b1ee'
   messagingSenderId: '1058794098347'
   measurementId: 'G-6FHJC9ZZ2C'
2. Initializes Clerk with publishableKey: 'pk_test_YWxsb3dpbmctY3ViLTc1LmNsZXJrLmFjY291bnRzLmRldiQ'
3. Initializes Hive
4. Wraps app in ProviderScope (Riverpod)
5. Theme: dark, primaryColor #2D4A3E, Poppins font
6. Router: splash → auth check → home OR login
```

---

### PROMPT F2 — Firestore Data Providers (CRITICAL — Sab screens isko use karengi)

```
Create lib/providers/sensor_providers.dart for Guardian Pulse Flutter app.

This file is the SINGLE SOURCE OF TRUTH for all live sensor data.
ALL data comes from Firebase Firestore real-time streams.

Create these Riverpod StreamProviders:

1. latestEcgProvider → StreamProvider<Map<String,dynamic>>
   Firestore: ecg_readings, orderBy timestamp desc, limit 1
   Where userId == current Clerk user ID
   Emits: {bpm, rawValue, isAnomaly, anomalyType, timestamp}

2. ecgHistoryProvider(String range) → StreamProvider<List<Map>>
   range: '1h' | '24h' | '7d' | '30d'
   Queries ecg_readings for current user filtered by time range
   Returns list of {bpm, timestamp}

3. latestMotionProvider → StreamProvider<Map<String,dynamic>>
   Firestore: motion_data, latest for current user
   Emits: {tremorDetected, tremorFrequency, stressLevel, accelX, accelY, accelZ}

4. activeAlertsProvider → StreamProvider<List<Map>>
   Firestore: alerts where userId==current AND status!='resolved'
   Real-time updates

5. chatMessagesProvider → StreamProvider<List<Map>>
   Firestore: chat_messages where userId==current
   orderBy timestamp asc

6. userProfileProvider → StreamProvider<Map<String,dynamic>>
   Firestore: users/{currentUserId}
   Real-time — when admin changes mode, app updates instantly

Helper function: getCurrentUserId() → Clerk.shared.session?.userId ?? ''

All providers handle loading and error states.
Use FirebaseFirestore.instance for all queries.
```

---

### PROMPT F3 — Splash + Auth Screen

```
Create splash and auth screens for Guardian Pulse Flutter app.

SPLASH SCREEN (lib/screens/splash_screen.dart):
- 3 second animated screen
- Dark background #1A2E1F
- Custom painter draws ECG heartbeat line animating across screen
  (use CustomPainter + AnimationController, draw peaks and valleys)
- "Guardian Pulse" text fades in — cream color #F5EDD6, Poppins bold 28px
- "Your Life. Monitored." subtitle fades in 0.5s later — sand #C4A882, 14px
- After 3s: check Clerk session → home if logged in, auth if not

AUTH SCREEN (lib/screens/auth_screen.dart):
- Full screen dark background
- Top: ECG pulse logo (simple animated line icon)
- "Guardian Pulse" title
- "Medical monitoring for those who care" — small subtitle
- SPACE
- Large button: Google icon + "Continue with Google" — sand color #C4A882
- Divider: "— or —"
- Email text field (dark olive border)  
- "Continue with Email" button — outlined style
  → Shows OTP input screen (6 digit boxes, auto-advance)
  → On verify → goes to Profile Setup (first time) or Home

Use Clerk Flutter SDK for both flows.
After successful auth: check Firestore users/{userId} exists
  YES → navigate to HomeScreen
  NO → navigate to ProfileSetupScreen
```

---

### PROMPT F4 — Profile Setup Screen

```
Create lib/screens/profile_setup_screen.dart for Guardian Pulse.

This shows ONLY on first login. After saving, never shows again.

SCREEN LAYOUT:
- Title: "Complete Your Profile" — progress indicator at top (step 1 of 1)
- Subtitle: "This helps us contact help if you need it"

FIELDS (all validated):
- Full Name (required) — text field
- Phone Number (required) — with +91 India prefix selector
- DIVIDER: "Emergency Contacts"
- Contact 1 Name (required)
- Contact 1 Phone (required)  
- Contact 1 Email (required) — for emergency emails
- Contact 2 Name (optional)
- Contact 2 Phone (optional)
- DIVIDER: "Agreement"
- Checkbox (required to proceed): 
  "I authorize Guardian Pulse to contact emergency services 
   and my emergency contacts if a medical emergency is detected"

"Get Started" button (disabled until all required fields + checkbox):
  → Saves to Firestore users/{userId} collection
  → Sets all fields including mode: 'normal'
  → Navigates to HomeScreen

Show loading spinner on save.
Show error snackbar if save fails.
```

---

### PROMPT F5 — Home Screen

```
Create lib/screens/home_screen.dart for Guardian Pulse.

All data from Riverpod providers (latestEcgProvider, latestMotionProvider, userProfileProvider).
Data is LIVE from Firestore — updates every time Pi sends new data.

LAYOUT (SingleChildScrollView, dark background #1A2E1F):

1. TOP STATUS BAR (sticky header card, dark olive #2D4A3E):
Left: colored dot — green if bpm 60-100, yellow if warning, red if critical
Center: "● LIVE" — sand color, subtle pulse animation on dot
Right: BPM number — large, bold, color matches dot
Below BPM: mode badge — "NORMAL MODE" / "SLEEP MODE" / "PARKINSON MODE"
Updates every time latestEcgProvider emits new value.
Show "-- BPM" with gray dot if no data yet.

2. VIDEO CAROUSEL (height 220px):
PageView.builder with 5 cards
Each VideoCard widget:
  - VideoPlayerController from assets/videos/video1.mp4 through video5.mp4
  - Loops silently
  - Gradient overlay (transparent → dark) at bottom
  - Title text at bottom: 
    Card 1: "Heart Attack Symptoms"
    Card 2: "Panic Attack"  
    Card 3: "Seizure Disorder"
    Card 4: "Parkinson's Disease"
    Card 5: "PTSD Episode"
  - Scale animation: currently visible card = 1.0, others = 0.95
Smooth dots indicator below carousel

3. LIVE ECG PREVIEW (tappable card):
Title row: "Live ECG Monitor" + small pulsing green dot
fl_chart LineChart:
  - Shows last 60 data points from latestEcgProvider history
  - Line color: green normal, yellow warning, red critical
  - No axis labels (preview mode)
  - Dark background, no grid
  - Height: 120px
"Tap for full analysis →" text at bottom right
onTap → navigate to EcgDetailScreen

4. VITALS ROW (4 cards in a Row):
Card 1 — BPM: large number + label
Card 2 — Stress: arc gauge widget 0-100, color coded
Card 3 — Tremor: circle dot green/red + "None"/"Detected"
Card 4 — Mode: text badge with icon

5. RECENT ALERTS (last 3 from activeAlertsProvider):
Title: "Recent Alerts"
Each item: colored icon + alert type text + "X min ago"
Empty state: green checkmark + "All clear"

BOTTOM NAVIGATION:
4 tabs: Home (house) | ECG (waveform) | Chat (bubble) | Settings (gear)
Active tab: sand color #C4A882
Tab bar background: dark olive #2D4A3E
```

---

### PROMPT F6 — ECG Detail Screen

```
Create lib/screens/ecg_detail_screen.dart for Guardian Pulse.

All live data from Riverpod: latestEcgProvider, ecgHistoryProvider.

HEADER: Back arrow + "ECG Monitor" title + PDF export icon (right)

TIME RANGE SELECTOR (segmented tabs below header):
"LIVE" | "1H" | "24H" | "7D" | "30D"
Selected tab: sand background #C4A882
Uses ecgHistoryProvider(selectedRange)

MAIN CHART (height: 260px, interactive):
fl_chart LineChart
- Line color: green (#4CAF50) normal, yellow (#FFC107) warning, red (#E05252) critical
- New points slide in from right when LIVE mode
- Long press on any point: tooltip showing exact BPM + time
- For 30D: BarChart showing daily average BPM
- Dark background, subtle olive grid lines
- Smooth animation when switching ranges
- Y-axis: BPM values (40 to 200)
- X-axis: time labels

ANOMALY MARKERS: red dots on chart at points where isAnomaly=true

ANALYSIS PANEL (cards below chart):
Row 1: Current BPM (large) | Trend arrow ↑↓→ | Rhythm label
Row 2: Min BPM today | Max BPM today | HRV Score
Row 3: Stress Level — full width gradient bar 0-100

RHYTHM STATUS (full width card):
"Normal Sinus Rhythm" in green
OR "Tachycardia Detected" in yellow
OR "Bradycardia Detected" in yellow  
OR "Critical — Seek Help" in red

AI ANALYSIS BUTTON (sand colored):
onTap → POST to https://api.guardianpulse.in/chat with:
  {userId, message: "Analyze my ECG from last 24 hours", history: []}
Shows BottomSheet with AI response text
Loading animation while waiting

EPISODE LOG (scrollable, below):
Title: "Episodes Today"
List of anomaly events: icon + type + time + duration
Empty: "No episodes detected today ✓"
```

---

### PROMPT F7 — Alert System

```
Create lib/services/alert_service.dart for Guardian Pulse.

This service runs whenever app is open AND in background.

SETUP (call from main.dart after Firebase init):
FirebaseMessaging.onMessage.listen → handles foreground FCM
FirebaseMessaging.onBackgroundMessage → handles background FCM
FirebaseMessaging.instance.getToken() → save FCM token to Firestore users/{userId}.fcmToken

ALERT RECEIVED (FCM payload has: alertId, alertType, severity):
→ Show AlertDialog (cannot be dismissed by outside tap):

FULL SCREEN ALERT DIALOG WIDGET (lib/widgets/alert_dialog_widget.dart):
- WillPopScope: onWillPop returns false (cannot back-press)
- Red border with pulse animation (@keyframes equivalent in Flutter)
- Large warning icon (red, animated scale 1.0 ↔ 1.2)
- Title: "⚠️ [alertType] Detected" — white, bold
- Body: condition description based on alertType
- COUNTDOWN WIDGET: CircularProgressIndicator counting down from 120 seconds
  Shows "2:00" → "1:59" → ... → "0:00"
  Green color → yellow at 60s → red at 30s
- Large green button: "I'M OKAY" (height 60px, full width)
  onTap → POST https://api.guardianpulse.in/resolve-alert {alertId}
  → Dialog closes → green snackbar "Stay safe!"

ON TIMEOUT (120 seconds):
- Dialog content changes:
  Title: "Notifying Emergency Contacts..."
  Show contact names being notified
  New countdown: 8 minutes
  Button still works: "I'M OKAY — CANCEL ESCALATION"

LOCATION TRACKING DURING ALERT:
Use geolocator startLocationUpdates(distanceFilter: 10)
Every location update → POST to backend /update-alert-location {alertId, lat, lng}
Stop when alert resolved

ALERT TYPES → COLORS:
'cardiac' → red, 'seizure' → orange, 'panic' → yellow,
'parkinson_tremor' → blue, 'ptsd' → gray
```

---

### PROMPT F8 — Chat Screen

```
Create lib/screens/chat_screen.dart for Guardian Pulse.

TABS at top: "AI Assistant" | "Live Support"

=== AI ASSISTANT TAB ===

HEALTH CONTEXT CARD (collapsible, top):
Sand colored card showing:
"Based on today's data: BPM avg 74 | Stress 32 | No episodes"
Data from latestEcgProvider + latestMotionProvider
Tap to collapse/expand

CHAT LIST (Firestore stream — chatMessages where sender != 'support'):
WhatsApp style bubbles:
- AI bubbles: left, dark olive #2D4A3E, cream text, "Guardian AI" label
- User bubbles: right, sand #C4A882, dark text
- Media bubbles: thumbnail image/video with play icon
- Timestamps below each bubble
- Typing indicator (3 animated dots) while waiting for API response

MESSAGE INPUT BAR (bottom):
- Text field: "Ask about your health..."
- Gallery icon → image_picker → upload via POST /upload-media → send URL
- Camera icon → direct capture
- Send button → calls POST https://api.guardianpulse.in/chat
  Body: {userId, message, history: last10Messages, mediaUrl: null|url}
  Auth: Bearer [Clerk JWT token]

=== LIVE SUPPORT TAB ===
Same chat UI but:
- Shows chat_messages where sender == 'support' OR needsSupport == true
- "Connect to Support" button at top
  onTap → POST /support-request → shows "Connecting..."
  When admin replies (sender:'support' in Firestore) → shows in real-time
- If no reply yet: "AI is assisting. Support will join shortly."
- Media upload same as AI tab
```

---

### PROMPT F9 — Settings Screen

```
Create lib/screens/settings_screen.dart for Guardian Pulse.

All changes save to BOTH:
1. Firestore users/{userId} — so admin website + backend use updated values instantly
2. Hive local storage — for offline access

PROFILE SECTION:
- Circular avatar (tap → image_picker → upload to R2 → save URL to Firestore)
- Name, phone fields (editable)
- "Save Profile" button

EMERGENCY CONTACTS SECTION:
- Contact 1: Name + Phone + Email (all editable)
- Contact 2: Name + Phone (optional, editable)
- "Send Test Alert" button → POST /test-alert → shows "Test SMS sent!" toast

MONITORING MODE SECTION (most important):
Three large selectable cards with icons:
  🟢 "Normal Mode" — subtitle: "Standard monitoring"
  🌙 "Sleep Mode" — subtitle: "Wider thresholds, silent alerts"
  🧠 "Parkinson Mode" — subtitle: "Enhanced tremor + seizure detection"
Selected card: sand border, slightly larger
onSelect → immediately updates Firestore users/{userId}.mode
Backend reads this mode for every analysis

NOTIFICATION PREFERENCES:
Toggle rows for each alert type: Cardiac | Seizure | Panic | PTSD | Parkinson
Sensitivity slider: Low | Medium | High (3 stops)
Emergency call toggle: "Call ambulance automatically"

DEVICE STATUS CARD:
- "Raspberry Pi" row: green dot "Connected" / red "Disconnected"
  (check if latestEcgProvider has data in last 30 seconds)
- "Last data received": "Just now" / "2 min ago" / "No data"
- "HiveMQ Bridge": green/red based on last Firestore write timestamp

PARKINSON MODE EXTRAS (visible only when mode == 'parkinson'):
- Medication reminders: list of times + add button
- Each reminder: flutter_local_notifications at that time
- "Generate Doctor Report" button → PDF export of last 7 days tremor data
- QTc gender toggle: Male (>450ms alert) | Female (>470ms alert)

PRIVACY:
- "Export My Data" → generates JSON of all my Firestore data
- "Delete History" → deletes ecg_readings + motion_data older than 30d
- "Privacy Policy" → launches guardianpulse.in/privacy
```
