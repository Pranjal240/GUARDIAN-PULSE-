# 🌐 FILE 06 — ADMIN WEBSITE PROMPTS (ANTIGRAVITY)
### Next.js Admin Dashboard | www.guardianpulse.in | Hinglish Guide

---

## CONTEXT PASTE — Antigravity session shuru karte time ye daalo

```
I am building Guardian Pulse admin dashboard website in Next.js 14.
Design: Olive and beach/sand color scheme.
Colors: Background #1A2E1F, Cards #2D4A3E, Accent #C4A882, Text #F5EDD6.
Font: Inter.
Auth: Clerk Next.js SDK.
Database: Firebase Firestore real-time subscriptions.
Animations: Framer Motion.
Charts: Recharts.
Hosting: Vercel.
This is an admin/doctor dashboard — NOT the patient app.
```

---

## PROMPT 1 — Next.js Setup + Layout

```
Setup Next.js 14 project for Guardian Pulse admin dashboard.

package.json dependencies:
next: 14, react: 18, typescript: yes
@clerk/nextjs: ^5.0.0          # Admin authentication
firebase: ^10.7.0               # Firestore real-time
framer-motion: ^11.0.0          # Animations
recharts: ^2.10.0               # ECG + stats charts
tailwindcss: ^3.4.0             # Styling
@radix-ui/react-dialog          # Modals
@radix-ui/react-select          # Dropdowns
lucide-react                    # Icons
date-fns                        # Date formatting
react-hot-toast                 # Notifications

ROOT LAYOUT (app/layout.tsx):
- ClerkProvider wrapping everything
- Dark background #1A2E1F globally
- Poppins font from Google Fonts
- Toast provider

SIDEBAR LAYOUT (components/Sidebar.tsx):
Fixed left sidebar, 240px wide, background #243B29:
Navigation links with icons:
  🏠 Dashboard
  👥 Patients  
  💓 ECG Monitor
  🚨 Alerts
  💬 Support Chat
  💰 Payments (placeholder)
  ⚙️ Settings
  
Active link: left border sand color (#C4A882), animated slide-in
Hover: background slides in from left (Framer Motion)
Bottom: Admin profile + logout button

TOP HEADER:
Right side: 
- 🔔 Notification bell with badge count (red, pulsing if alerts active)
- Admin name + avatar
- "LIVE" pulsing indicator (green dot)

PAGE TRANSITIONS:
Framer Motion AnimatePresence on page changes:
- Fade in + slide up (y: 20 → 0, opacity 0 → 1)
- Duration: 0.3s, ease: easeOut
```

---

## PROMPT 2 — Dashboard Overview Page

```
Create the main Dashboard page (app/dashboard/page.tsx) for Guardian Pulse.

TOP STATS (4 cards, animated count-up on load, staggered 0.1s each):
- Total Patients: number from Firestore
- 🔴 Active Alerts: number, card pulses red if > 0
- Avg BPM: average across all patients
- Critical Today: patients who had emergency alerts

Cards: dark olive bg #2D4A3E, sand accent, Framer Motion entry animation

MIDDLE SECTION (2 columns):
Left col (60%): "Live Alert Feed"
- Firestore real-time subscription to alerts where status = 'pending'
- Each alert card:
  → Patient name + avatar
  → Alert type with colored icon
  → "X minutes ago" timestamp
  → Patient location (city name)
  → Three buttons: "Mark Safe" | "Call Patient" | "View Details"
- New alerts slide in from top (Framer Motion)
- Empty state: "✓ No active alerts" in green

Right col (40%): "Patient Activity"
- Mini Recharts LineChart per patient (top 6 active patients)
- Each mini chart: last 20 BPM readings
- Line color: green/yellow/red based on current BPM
- Auto-refreshing from Firestore every 3 seconds

BOTTOM SECTION:
Left: "Alerts Last 30 Days" (Recharts BarChart by date)
Right: "Alert Types Breakdown" (Recharts PieChart)

All data from Firestore — use React hooks with onSnapshot for real-time.
Skeleton loaders while data fetches (olive shimmer animation).
```

---

## PROMPT 3 — Live ECG Monitor Page

```
Create ECG Monitor page (app/ecg-monitor/page.tsx) for Guardian Pulse.

FILTER BAR at top:
- Search by patient name
- Filter dropdown: All | Normal | Warning | Critical
- "Refresh All" button
- Patient count: "Showing 12 patients"

PATIENT GRID (3 columns desktop, 1 mobile):
Each patient ECG card:
- Avatar + name + status badge (🟢 Normal / 🟡 Warning / 🔴 Critical)
- Mini ECG chart (Recharts AreaChart, 30 data points)
  - Green area: normal BPM
  - Yellow: warning
  - Red: critical (+ pulsing glow CSS animation)
- Current BPM: large, color coded
- HRV score: small text
- "Last update: X seconds ago"
- Hover: card lifts (box shadow + scale 1.02)
- Click → opens Patient Detail Modal

PATIENT DETAIL MODAL (full screen slide-in from right):
Tabs: Overview | ECG History | Alerts | Settings | Notes

Overview tab:
- Personal info (editable)
- Emergency contacts
- Device connection status
- Current vitals (all)

ECG History tab:
- Full Recharts LineChart with time range selector
- Live | 1H | 24H | 7D | 30D toggle
- Anomaly markers on chart (red dots at detected events)
- Export CSV button

Alerts tab:
- Timeline view of all alerts
- Each: timestamp, type, duration, what action was taken

Settings tab (admin can edit everything):
- Monitoring mode selector (Normal/Sleep/Parkinson)
- Custom BPM thresholds override
- Alert sensitivity
- Changes save to Firestore → instantly updates in patient's app

Notes tab:
- Doctor can add text notes
- Saved in Firestore with timestamp and doctor name
- Notes visible to admin only
```

---

## PROMPT 4 — Alerts Management Page

```
Create Alerts page (app/alerts/page.tsx) for Guardian Pulse.

LIVE ALERTS SECTION (top, auto-refreshing):
Firestore real-time subscription: alerts where status != 'resolved'

Each active alert card (large, dramatic):
- Red pulsing border for critical, orange for warning
- Patient name + photo (large)
- Alert type: big icon + text
- Timer: "Alert active for X:XX"
- Status timeline: 
  🔴 Detected → 🟠 User Notified → 🟡 Contact Notified → 🚨 Ambulance
  (dots connected by line, completed dots filled)
- Location: Google Maps embed (small, shows patient location)
- Action buttons:
  ✅ "Mark Resolved" → updates Firestore status
  📞 "Contact Patient" (shows phone number)
  🚨 "Manual Escalate" → triggers next escalation step

ALERT HISTORY TABLE:
Columns: Patient | Alert Type | Started | Duration | Status | Outcome
- Filter: date range picker, type filter, status filter
- Sort by any column
- Click row → slide-in drawer with full alert timeline
- "Export CSV" button

STATISTICS SECTION:
- Recharts: Heatmap of alerts by hour of day + day of week
- Average response time gauge
- False alarm rate: "XX% users responded 'I'm okay'"
- Most common alert type: pie chart

All with Framer Motion fade-in, skeleton loaders.
```

---

## PROMPT 5 — Support Chat Page

```
Create Support Chat page (app/support/page.tsx) for Guardian Pulse.

LAYOUT: Two-panel split (WhatsApp Web style)

LEFT PANEL (300px, conversation list):
- Search bar: filter by patient name
- "NEEDS ATTENTION" section (red badge):
  Firestore: chat_messages where needsSupport = true, grouped by userId
- "ALL CONVERSATIONS" below
Each conversation item:
  - Patient avatar + name
  - Last message preview (truncated)
  - Timestamp
  - Unread count badge (sand colored)
  - "NEW" badge for first contact
  - Selecting → loads conversation in right panel

RIGHT PANEL (remaining width):
TOP BAR:
- Patient name + avatar
- Current vitals mini: "BPM: 76 | Stress: 32"
- Buttons: "View Patient" | "Mark Resolved"

CHAT AREA (scrollable):
- Messages from Firestore real-time subscription
- Patient messages: left (dark olive bubble)
- Support messages: right (sand bubble)
- AI messages: left (gray bubble, labeled "AI")
- Image/video thumbnails clickable
- Timestamps under each message
- "Read" tick marks

INPUT AREA:
- Text input + Send button
- Attach file icon → opens file picker
- Template responses dropdown (quick replies)
- "Hand off to AI" button
- All messages written here → stored in Firestore with sender: 'support'

NOTIFICATION:
When needsSupport becomes true in Firestore:
- Browser notification (if tab not active)
- Toast notification in-app
- Unread badge on sidebar link
```

---

## PROMPT 6 — Final Animations Polish

```
Add these animations throughout ALL Guardian Pulse admin website pages:

1. STATS CARDS — count-up animation:
Use React hook useCountUp(targetNumber, duration=1500):
Numbers count from 0 to target on page load.

2. ECG PATIENT CARDS — staggered entry:
Framer Motion variants:
  container: { show: { transition: { staggerChildren: 0.08 } } }
  card: { hidden: {y:30, opacity:0}, show: {y:0, opacity:1, transition:{duration:0.4}} }

3. CRITICAL ALERT PULSE:
@keyframes criticalPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(224,82,82,0.4) }
  50% { box-shadow: 0 0 0 12px rgba(224,82,82,0) }
}
Apply to cards with status = 'critical'.

4. LIVE DATA UPDATE FLASH:
When BPM number changes → brief scale pulse:
  animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.3 }}
  Color briefly flashes to accent color then back.

5. SIDEBAR ACTIVE INDICATOR:
Left border: Framer Motion layoutId="activeIndicator"
Smoothly slides from one link to next on navigation.

6. PAGE SKELETON LOADERS:
Olive shimmer animation on all loading states:
  background: linear-gradient(90deg, #2D4A3E, #3D5A4E, #2D4A3E)
  background-size: 200% 100%
  animation: shimmer 1.5s infinite

7. ALERT NEW ENTRY:
New alert appears with spring animation:
  initial={{ x: -100, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
```
