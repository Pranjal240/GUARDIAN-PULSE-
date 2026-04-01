# 🌐 GUARDIAN PULSE — WEBSITE NUCLEAR REBUILD PROMPT

### Paste this ENTIRE file into Antigravity (Gemini 2.5 Pro) — Session 1

---

## CRITICAL RULES BEFORE STARTING

1. Use STITCH MCP for EVERY single component and page — call Stitch first, then implement
2. Color palette: OLIVE ONLY — no beige, no sand, no cream. Pure olive spectrum.
3. ALL data from Firebase Realtime Database (NOT Firestore)
4. Google login via Clerk MUST work on the landing page
5. Every component must have Framer Motion animations
6. Zero TypeScript errors — compile clean

---

## STITCH MCP BRIEF (Pass to EVERY Stitch call)

```
App: Guardian Pulse Medical Monitoring Dashboard
Style: Pure olive monochrome — ALL shades of olive green only
Mood: Military precision meets medical clarity — dark, confident, alive
Typography: Anybody (display) + DM Mono (data/numbers) from Google Fonts
Motion: High-energy — data streaming in, numbers ticking, pulse animations
NO beige, NO sand, NO cream — ONLY olive spectrum
```

---

## OLIVE-ONLY COLOR SYSTEM (Use EXACTLY these)

```css
:root {
  /* Backgrounds */
  --bg-void: #060d06; /* deepest black-olive */
  --bg-primary: #0a110a; /* main page bg */
  --bg-card: #111c11; /* card bg */
  --bg-elevated: #162416; /* elevated cards */
  --bg-sidebar: #0d170d; /* sidebar */
  --bg-input: #0f1a0f; /* inputs */

  /* Olive spectrum */
  --olive-900: #1a2e1a;
  --olive-800: #243d24;
  --olive-700: #2e4e2e;
  --olive-600: #3a6133;
  --olive-500: #4a7a3d; /* PRIMARY ACCENT */
  --olive-400: #5e9b4e; /* hover states */
  --olive-300: #78c060; /* active/success */
  --olive-200: #9ed485; /* highlights */
  --olive-100: #c4eab0; /* light accents */

  /* Text */
  --text-primary: #d4f0c8; /* main text — light olive */
  --text-secondary: #7bad6a; /* secondary text */
  --text-muted: #3d5c35; /* muted labels */
  --text-data: #a8e090; /* data values — bright olive */

  /* Status (all olive-tinted) */
  --status-ok: #4cca6a; /* normal BPM */
  --status-warn: #c4ca4a; /* warning */
  --status-crit: #ca4a4a; /* critical */
  --status-live: #6cda50; /* live indicator */

  /* Borders & Dividers */
  --border-card: rgba(74, 122, 61, 0.15);
  --border-active: rgba(94, 155, 78, 0.5);
  --border-glow: rgba(94, 155, 78, 0.3);

  /* Shadows */
  --shadow-card: 0 4px 32px rgba(0, 0, 0, 0.6);
  --shadow-glow: 0 0 24px rgba(78, 155, 78, 0.2);
  --shadow-crit: 0 0 24px rgba(202, 74, 74, 0.25);
}
```

---

## PACKAGE.JSON (Complete — use exact versions)

```json
{
  "name": "guardian-pulse-website",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "typescript": "5.4.5",
    "@clerk/nextjs": "5.2.4",
    "firebase": "10.12.2",
    "framer-motion": "11.2.12",
    "recharts": "2.12.7",
    "lucide-react": "0.395.0",
    "react-hot-toast": "2.4.1",
    "date-fns": "3.6.0",
    "@radix-ui/react-dialog": "1.0.5",
    "@radix-ui/react-select": "2.0.0",
    "@radix-ui/react-tabs": "1.0.4",
    "@radix-ui/react-switch": "1.0.3",
    "@radix-ui/react-slider": "1.1.2",
    "clsx": "2.1.1",
    "tailwind-merge": "2.3.0"
  },
  "devDependencies": {
    "tailwindcss": "3.4.4",
    "autoprefixer": "10.4.19",
    "postcss": "8.4.39",
    "@types/react": "18.3.3",
    "@types/node": "20.14.9"
  }
}
```

---

## TAILWIND CONFIG (tailwind.config.ts — complete)

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        olive: {
          void: "#060D06",
          950: "#0A110A",
          900: "#0D170D",
          850: "#111C11",
          800: "#162416",
          750: "#1A2E1A",
          700: "#243D24",
          600: "#2E4E2E",
          500: "#3A6133",
          400: "#4A7A3D",
          300: "#5E9B4E",
          200: "#78C060",
          100: "#9ED485",
          50: "#C4EAB0",
        },
        data: "#A8E090",
        live: "#6CDA50",
      },
      fontFamily: {
        display: ["Anybody", "sans-serif"],
        mono: ["DM Mono", "monospace"],
        body: ["DM Sans", "sans-serif"],
      },
      animation: {
        "pulse-olive": "pulseOlive 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        scan: "scan 3s linear infinite",
        "data-in": "dataIn 0.4s ease-out forwards",
        glow: "glowPulse 2s ease-in-out infinite",
        crit: "critPulse 1s ease-in-out infinite",
        live: "liveBlink 1.5s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        pulseOlive: {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(94,155,78,0.4)",
          },
          "50%": { opacity: "0.8", boxShadow: "0 0 0 12px rgba(94,155,78,0)" },
        },
        scan: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100vw)" },
        },
        dataIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(94,155,78,0.3)" },
          "50%": { boxShadow: "0 0 24px rgba(94,155,78,0.6)" },
        },
        critPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(202,74,74,0.5)" },
          "50%": { boxShadow: "0 0 0 16px rgba(202,74,74,0)" },
        },
        liveBlink: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.3", transform: "scale(0.85)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      backgroundImage: {
        "grid-olive":
          "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M0 0v40M40 0v40M0 0h40M0 40h40' stroke='rgba(74,122,61,0.08)' stroke-width='1'/%3E%3C/svg%3E\")",
        noise:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
export default config;
```

---

## GLOBALS.CSS (src/app/globals.css — COMPLETE)

```css
@import url("https://fonts.googleapis.com/css2?family=Anybody:ital,wdth,wght@0,75..125,100..900;1,75..125,100..900&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg-void: #060d06;
  --bg-primary: #0a110a;
  --bg-card: #111c11;
  --bg-elevated: #162416;
  --bg-sidebar: #0d170d;
  --olive-400: #4a7a3d;
  --olive-300: #5e9b4e;
  --olive-200: #78c060;
  --text-primary: #d4f0c8;
  --text-secondary: #7bad6a;
  --text-muted: #3d5c35;
  --status-ok: #4cca6a;
  --status-warn: #c4ca4a;
  --status-crit: #ca4a4a;
  --status-live: #6cda50;
  --border-card: rgba(74, 122, 61, 0.15);
}

html,
body {
  background: var(--bg-void);
  color: var(--text-primary);
  font-family: "DM Sans", sans-serif;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #2e4e2e #060d06;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
}

.card-elevated {
  background: var(--bg-elevated);
  border: 1px solid rgba(94, 155, 78, 0.2);
  border-radius: 16px;
  box-shadow:
    0 8px 48px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(94, 155, 78, 0.1);
}

.shimmer-olive {
  background: linear-gradient(90deg, #111c11 25%, #1a2e1a 50%, #111c11 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.ecg-line {
  stroke: var(--olive-200);
  stroke-width: 2;
  fill: none;
  filter: drop-shadow(0 0 4px rgba(120, 192, 96, 0.6));
}

.bpm-display {
  font-family: "DM Mono", monospace;
  font-size: 3.5rem;
  font-weight: 500;
  color: var(--status-ok);
  letter-spacing: -0.02em;
  text-shadow: 0 0 20px rgba(76, 202, 106, 0.5);
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(108, 218, 80, 0.1);
  border: 1px solid rgba(108, 218, 80, 0.3);
  border-radius: 999px;
  padding: 4px 12px;
  font-family: "DM Mono", monospace;
  font-size: 0.75rem;
  color: var(--status-live);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--status-live);
  animation: liveBlink 1.5s ease-in-out infinite;
  box-shadow: 0 0 8px var(--status-live);
}

.scrollbar-olive::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-olive::-webkit-scrollbar-track {
  background: #0a110a;
}
.scrollbar-olive::-webkit-scrollbar-thumb {
  background: #2e4e2e;
  border-radius: 2px;
}

@keyframes pulseOlive {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(94, 155, 78, 0.4);
  }
  50% {
    box-shadow: 0 0 0 12px rgba(94, 155, 78, 0);
  }
}
@keyframes liveBlink {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(0.85);
  }
}
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
@keyframes critPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(202, 74, 74, 0.5);
  }
  50% {
    box-shadow: 0 0 0 16px rgba(202, 74, 74, 0);
  }
}
@keyframes ecgDraw {
  from {
    stroke-dashoffset: 1000;
  }
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes scanLine {
  0% {
    left: -2px;
  }
  100% {
    left: 100%;
  }
}
```

---

## FILE STRUCTURE (Complete — generate ALL these files)

```
src/
  app/
    layout.tsx                     ← ClerkProvider + fonts + dark olive
    page.tsx                       ← LANDING PAGE (public) — Google/Apple login
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx
    dashboard/
      layout.tsx                   ← Sidebar + Header shell
      page.tsx                     ← Overview dashboard
      ecg-monitor/page.tsx         ← Live ECG grid
      alerts/page.tsx              ← Alert management
      support/page.tsx             ← Support chat
      patients/page.tsx            ← Patient management
    patient/
      page.tsx                     ← Patient self-view
  components/
    landing/
      HeroSection.tsx              ← Animated ECG hero
      FeatureCards.tsx
      AuthButtons.tsx              ← Google + Apple login buttons
    dashboard/
      Sidebar.tsx
      TopHeader.tsx
      StatCard.tsx
      EcgLineChart.tsx
      PatientCard.tsx
      AlertCard.tsx
      LiveFeed.tsx
    ui/
      OliveButton.tsx
      OliveCard.tsx
      SkeletonLoader.tsx
      LiveBadge.tsx
      BpmDisplay.tsx
      StatusDot.tsx
  lib/
    firebase.ts
    firebase-hooks.ts
    nvidia-api.ts                  ← NVIDIA NIM integration
    resend.ts                      ← Resend email (server actions)
    twilio.ts                      ← Twilio SMS + calls
  middleware.ts
```

---

## PAGE: app/page.tsx — LANDING PAGE (Critical — Google login here)

```
USE STITCH MCP → design: "Guardian Pulse landing page — pure olive black,
full height, ECG heartbeat animation as hero visual, Google and Apple
login buttons prominently centered, military-grade medical aesthetic,
Anybody font display, animated scan lines, no other colors except olive"

Build the complete public landing page:

LAYOUT:
- Full viewport height, bg #060D06
- Animated scan line (thin olive line sweeping left to right, 4s loop)
- Background: css grid pattern (subtle olive grid lines 0.05 opacity)

TOP NAV (fixed, glass effect):
  Left: Logo image from /logo/ folder (32px height) + "GUARDIAN PULSE" in DM Mono
  Right: "Admin Login" button (olive border, olive text)
  Nav bg: rgba(6,13,6,0.8) with backdrop-blur-md
  Border bottom: 1px solid rgba(74,122,61,0.15)

HERO SECTION (full height, centered):

  TOP BADGE (animated fade in, delay 0s):
    <span class="live-badge"> ● LIVE MONITORING ACTIVE </span>

  TITLE (staggered chars, Framer Motion):
    "YOUR HEART."  — font-display text-7xl font-black tracking-tighter
    "MONITORED."   — same but olive-300 colored
    Each word animates in with y: 60→0, opacity: 0→1, stagger 0.15s

  SUBTITLE (fade in delay 0.6s):
    "Real-time ECG analysis. Seizure detection. Emergency response."
    text-olive-300, DM Sans, text-xl, max-w-md, text-center

  ECG ANIMATION (Framer Motion SVG, delay 0.3s):
    SVG width 600px height 120px
    Draw ECG waveform path animating left to right using pathLength
    Colors: olive-300 (#78C060)
    Add glow filter: drop-shadow 0 0 8px rgba(120,192,96,0.7)
    Loop infinitely — translate X from 0 to -600 with new segment appearing

  STATS ROW (3 numbers, count-up animation, delay 0.8s):
    "< 2s" Detection Speed
    "108" Emergency dial
    "24/7" Monitoring
    Each: DM Mono font, text-4xl, olive-200 color, stagger 0.1s

  AUTH BUTTONS (delay 1.0s, scale in):

    GOOGLE LOGIN BUTTON:
    - Background: #111C11
    - Border: 1px solid rgba(94,155,78,0.4)
    - On hover: border olive-300, box-shadow 0 0 20px rgba(94,155,78,0.3)
    - Height: 56px, width: 320px, border-radius: 12px
    - Layout: SVG Google logo (colorful, 20px) + "Continue with Google"
    - Text: DM Sans medium, text-olive-100, 16px
    - Framer Motion: whileHover scale 1.02, whileTap scale 0.98
    - onClick: clerk signIn with Google provider

    APPLE LOGIN BUTTON:
    - Same style but Apple SVG logo (white apple icon)
    - "Continue with Apple"
    - onClick: clerk signIn with Apple provider (if configured)
    OR show "Coming Soon" toast

    DIVIDER: thin olive line with "or" in DM Mono

    EMAIL LINK:
    - Text only: "Sign in with email →"
    - olive-300 color, underline on hover
    - onClick: router.push('/sign-in')

  ADMIN BADGE (bottom of hero, delay 1.2s):
    Small text: "Admin? " + link "Access Dashboard →"
    Uses Clerk's isSignedIn to check — redirect to /dashboard if already authed

FEATURES SECTION (below fold):
  USE STITCH → "Feature cards grid, pure olive dark theme"
  3 cards in grid:
    1. "ECG Analysis" — Activity icon, "Pan-Tompkins algorithm detects anomalies in real-time"
    2. "Seizure Detection" — Zap icon, "MPU6050 tremor analysis at 4-6Hz Parkinson's range"
    3. "Emergency Response" — Shield icon, "2-minute countdown → SMS → 8-minute → Ambulance"

  Card style:
    bg: olive-900 (#0D170D)
    border: 1px solid rgba(94,155,78,0.12)
    On hover: border rgba(94,155,78,0.4), translate Y -4px
    Icon: olive-300, 32px
    Title: DM Mono, olive-100, 18px
    Body: DM Sans, olive-300, 14px

FOOTER:
  "Guardian Pulse © 2026" + links: Privacy | Terms | Status
  All olive-600 color, tiny font

TECH:
- Use Clerk's useClerk() hook for signIn
- Google: clerk.signIn.authenticateWithRedirect({ strategy: 'oauth_google', redirectUrl: '/sso-callback', redirectUrlComplete: '/dashboard' })
- Apple: same but strategy: 'oauth_apple'
- If signIn fails → toast.error("Login failed. Try again.")
- After login: check Firebase users/{userId}/role → redirect accordingly
```

---

## LAYOUT: app/dashboard/layout.tsx — SIDEBAR + HEADER

```
USE STITCH MCP → design: "Medical dashboard admin layout — pure olive,
fixed left sidebar 256px with logo top, navigation with olive active
states, top header with LIVE badge and notification bell,
page content right — military precision aesthetic"

SIDEBAR (256px fixed left, full height, bg #0D170D):
  Top section:
    Logo img from /logo/ (36px) + "GUARDIAN PULSE" DM Mono
    Border bottom: 1px solid rgba(74,122,61,0.1)
    Padding: 20px 24px

  Nav section (scrollable):
    Items:
      LayoutDashboard  → /dashboard          "OVERVIEW"
      Activity         → /dashboard/ecg-monitor  "ECG MONITOR"
      Users            → /dashboard/patients     "PATIENTS"
      AlertTriangle    → /dashboard/alerts        "ALERTS"
      MessageSquare    → /dashboard/support       "SUPPORT"
      Settings         → /dashboard/settings      "SETTINGS"

    Each item:
      padding: 10px 20px
      font: DM Mono, 11px, letter-spacing 0.08em, UPPERCASE
      color: olive-500 when inactive
      color: olive-200 when active
      bg active: rgba(74,122,61,0.12)
      border-left active: 3px solid #5E9B4E (Framer Motion layoutId="activeNav")
      icon: 16px, left side
      Hover: bg rgba(74,122,61,0.06), color olive-100 transition

    Framer Motion: stagger entry 0.05s each on mount

  Bottom section:
    Clerk UserButton component
    User name in DM Mono olive-300
    "SIGN OUT" text button

TOP HEADER (fixed top, left: 256px, right: 0, height: 56px):
  bg: rgba(10,17,10,0.9) backdrop-blur-md
  border-bottom: 1px solid rgba(74,122,61,0.1)

  Left: Breadcrumb (current page name in DM Mono)
  Right:
    Live badge (animated dot + "LIVE" text)
    Bell icon + red count badge (useActiveAlerts)
    UserButton from Clerk

Page content:
  ml-64 mt-14, bg #060D06
  Framer Motion AnimatePresence on route changes
  Each page: initial opacity:0 y:16 → animate opacity:1 y:0, 0.3s ease-out
```

---

## PAGE: dashboard/page.tsx — OVERVIEW

```
USE STITCH MCP → design: "Medical admin overview — pure olive, 4 stat
cards with number count-up, live alert feed with pulse animation,
patient activity mini ECG charts, data coming from Firebase RTDB,
everything animated and data-driven"

ALL DATA from Firebase RTDB hooks (see firebase-hooks.ts section).

STAT CARDS ROW (4 cards, stagger 0.1s Framer Motion):
  Each card style:
    bg: #111C11
    border-top: 3px solid #4A7A3D
    border: 1px solid rgba(74,122,61,0.15)
    border-radius: 12px, padding: 24px
    Number: DM Mono font, 2.5rem, color: #A8E090
    Count-up animation: 0 → target in 1.5s using requestAnimationFrame
    Label: DM Mono 10px, text-olive-500, uppercase, tracking-wider
    Icon: right side, olive-700, 32px

  Card 1: "TOTAL PATIENTS" — users count
  Card 2: "ACTIVE ALERTS" — alerts count, if >0 → critPulse animation on card, glow red
  Card 3: "AVG BPM" — average of all latest ecg_readings
  Card 4: "CRITICAL TODAY" — alerts from today with severity emergency

MIDDLE SECTION (grid-cols-5 gap-4):
  LEFT (col-span-3) — "LIVE FEED":
    Title: "LIVE ALERT FEED" in DM Mono + live badge

    Alert cards (from useActiveAlerts, Framer Motion spring animation):
      bg: #111C11
      Left border: 3px, color based on type
        cardiac: #CA4A4A
        seizure: #CA8A4A
        panic: #CACA4A
        parkinson: #4A8ACA
        ptsd: #8A4ACA

      Content:
        Patient initials circle (olive-700 bg, olive-200 text)
        Patient name + alert type
        "X min ago" — live updating timer
        "MARK SAFE" button → POST /resolve-alert, then remove card

      New alert enters: x:-60 → x:0, spring stiffness:400
      Resolved: opacity:1 → 0, height collapses

    Empty state: large checkmark SVG + "ALL SYSTEMS NORMAL" in DM Mono

  RIGHT (col-span-2) — "PATIENT STATUS":
    Top 6 patients from useAllPatients
    Each mini card:
      Initials circle + name + live BPM (DM Mono)
      Recharts AreaChart height 50px, NO axes, NO grid
      Stroke: #5E9B4E normal, #C4CA4A warning, #CA4A4A critical
      Area fill: same color at 0.1 opacity
      Critical: box-shadow 0 0 16px rgba(202,74,74,0.3)

BOTTOM SECTION (grid-cols-2 gap-4):
  Left: "ALERTS — LAST 30 DAYS"
    Recharts BarChart
    Bars: fill #3A6133 normal, fill #CA4A4A if today
    Tooltip: olive bg, olive border
    CartesianGrid: stroke rgba(74,122,61,0.1)
    All axes: stroke #3D5C35, tick fill #7BAD6A, DM Mono font 10px

  Right: "ALERT DISTRIBUTION"
    Recharts PieChart + Legend
    Colors: all olive spectrum
      cardiac: #CA4A4A
      seizure: #CA8A4A
      panic: #CACA4A
      parkinson: #4A8ACA
      ptsd: #8A4ACA
    Legend: DM Mono 11px, olive-300

SKELETON: .shimmer-olive class while loading
```

---

## PAGE: dashboard/ecg-monitor/page.tsx — CRITICAL (FIX DATA)

```
USE STITCH MCP → "ECG patient grid — olive dark, patient cards with live
ECG waveform lines in olive green, status badges, critical cards
pulsing red, search filter bar at top"

THIS PAGE IS THE MOST IMPORTANT — fix data pipeline here.

CRITICAL DATA FIX (implement this exactly):
  1. useAllPatients() hook must:
     a. Query Firebase: ref(db, 'ecg_readings'), limitToLast(500)
     b. Extract ALL unique userIds from ecg data
     c. Query Firebase: ref(db, 'users') for profiles
     d. Merge: if userId in ecg but not in users → create synthetic patient:
        { userId, name: userId, role: 'patient', mode: 'normal' }
     e. Return merged unique list — ALWAYS includes 'pranjal_001'

  2. Hardcode fallback: ALWAYS show 'pranjal_001' card even if no data

  3. usePatientECG(userId, limit=60):
     Query: ref('ecg_readings') orderByChild('userId') equalTo(userId) limitToLast(limit)
     Parse DataSnapshot → array sorted by timestamp

FILTER BAR:
  bg: #0D170D, border-bottom: 1px solid rgba(74,122,61,0.1)
  padding: 16px 24px
  Search input: bg #111C11, border rgba(74,122,61,0.2), olive text
  Status filter: "ALL" | "NORMAL" | "WARNING" | "CRITICAL" — pill buttons
  Count chip: "SHOWING X PATIENTS" in DM Mono olive-500

PATIENT GRID (grid-cols-3 gap-4):
  PatientECGCard:
    bg: #111C11
    border: 1px solid rgba(74,122,61,0.12)
    border-radius: 12px
    Hover: scale(1.02), box-shadow 0 8px 32px rgba(0,0,0,0.5)
    Framer Motion: whileHover

    TOP ROW:
      Initials circle (bg olive-700, text olive-100, 36px)
      Name + status badge
        Normal: bg rgba(76,202,106,0.1), border rgba(76,202,106,0.3), text #4CCA6A, "NORMAL"
        Warning: rgba(196,202,74,0.1), "WARNING"
        Critical: rgba(202,74,74,0.1), border rgba(202,74,74,0.3), "CRITICAL"
          + critPulse animation on card border

    ECG MINI CHART (Recharts LineChart, height 72px):
      width: 100%, NO axes, NO grid, NO tooltip
      dot: false, animationDuration: 800
      stroke: #5E9B4E normal / #CACA4A warning / #CA4A4A critical
      strokeWidth: 1.5
      Wrap in ResponsiveContainer width="100%" height={72}
      If critical: parent div box-shadow: 0 0 20px rgba(202,74,74,0.2)

    BOTTOM ROW:
      "BPM" label (DM Mono 10px, olive-500)
      BPM value (DM Mono 28px, color-coded)
      "UPDATED X seconds ago" (tiny, olive-600)

    onClick: open patient detail modal

PATIENT DETAIL MODAL (Framer Motion slide from right):
  initial: x:'100%', opacity: 0
  animate: x:0, opacity: 1
  transition: type:'spring', stiffness:300, damping:30

  Full screen overlay, bg #060D06
  Close button top-right

  Tabs (DM Mono, 11px, uppercase):
    OVERVIEW | ECG HISTORY | ALERTS | SETTINGS | NOTES
    Active tab: olive-300 underline, 2px

  Overview tab:
    Patient info cards
    Live vitals (BPM large, stress bar, tremor dot, mode badge)
    Device status (Connected/Offline dot)

  ECG History tab:
    Time range pills: LIVE | 1H | 24H | 7D | 30D
    Full Recharts chart, height 240px
    Anomaly markers: red circles at isAnomaly points
    Export CSV button (olive-700 bg)

  Settings tab (Admin edits → Firebase updates instantly):
    Mode selector: NORMAL | SLEEP | PARKINSON
    onChange: ref(db, `users/${userId}/mode`).set(newMode)

  Notes tab:
    Textarea (bg #111C11, olive border)
    Save button → push to Firebase users/{userId}/notes array
```

---

## PAGE: dashboard/alerts/page.tsx — ALERTS

```
USE STITCH MCP → "Alert management — dramatic olive-dark cards with
colored type borders, escalation timeline, location map embed,
action buttons — urgent medical control room aesthetic"

ACTIVE ALERTS (real-time Firebase):
  Each alert card (large, full-width):
    Left accent border: 4px, type-colored
    bg: linear-gradient(135deg, rgba(alertColor,0.04) 0%, #111C11 100%)

    LAYOUT:
      Left: Patient avatar (64px) + name + phone chip
      Center:
        Alert type badge (icon + type text, large)
        Timer: "ACTIVE FOR MM:SS" — live counting, DM Mono, olive-200
        ESCALATION TIMELINE:
          ●━━━●━━━○━━━○
          Dot 1: DETECTED (filled olive-300)
          Dot 2: NOTIFIED (filled if >30s)
          Dot 3: CONTACTS ALERTED (filled if >2min)
          Dot 4: AMBULANCE (filled if >8min)
          Connecting lines: olive-700 bg
      Right:
        Google Maps iframe OR Leaflet map (200x150px, rounded)
        "Mark Resolved" button: bg rgba(76,202,106,0.15), border olive-300
        Contact chips with phone numbers

  Spring animation on new alert: y:-40 → y:0

HISTORY TABLE (below):
  Striped: even rows #111C11, odd #0D170D
  Headers: DM Mono 10px uppercase olive-500
  Pagination: olive buttons

STATS ROW:
  Avg Response Time | False Alarm Rate | Today's Count
  All DM Mono, large numbers, olive-200
```

---

## PAGE: dashboard/support/page.tsx — CHAT

```
USE STITCH MCP → "WhatsApp Web style support chat — pure olive,
conversation list left, chat area right, olive message bubbles,
patient AI messages, admin reply bubbles — medical support tool"

LEFT PANEL (280px, bg #0D170D):
  "CONVERSATIONS" header in DM Mono
  Search bar

  Conversation items:
    Patient name + last message preview
    "NEEDS SUPPORT" red badge for needsSupport:true
    Unread count: olive-300 circle
    Active: left border 2px olive-300 + bg #111C11

RIGHT PANEL (flex-1):
  Message bubbles:
    Patient: bg #162416, border rgba(74,122,61,0.2), text #D4F0C8
    AI: bg #0F1A0F, border dashed rgba(74,122,61,0.15), italic, "GUARDIAN AI" label
    Admin: bg rgba(74,122,61,0.2), border rgba(94,155,78,0.4), right-aligned

  Input bar: bg #0D170D, olive border
  Send button: olive-500 bg
  Quick replies: olive pills

NOTIFICATION: Browser notification API when needsSupport arrives
```

---

## lib/firebase.ts (REALTIME DATABASE — correct setup)

```typescript
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc",
  authDomain: "guardian-pulse-1360c.firebaseapp.com",
  databaseURL:
    "https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "guardian-pulse-1360c",
  storageBucket: "guardian-pulse-1360c.firebasestorage.app",
  messagingSenderId: "1058794098347",
  appId: "1:1058794098347:web:e358b1e45760d97127b1ee",
  measurementId: "G-6FHJC9ZZ2C",
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getDatabase(app);
export default app;
```

---

## lib/firebase-hooks.ts (COMPLETE — Fix data pipeline)

```typescript
"use client";
import { useEffect, useState } from "react";
import {
  ref,
  onValue,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  off,
} from "firebase/database";
import { db } from "./firebase";

export interface Patient {
  userId?: string;
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
  mode?: string;
  fcmToken?: string;
  emergencyContact1Name?: string;
  emergencyContact1Phone?: string;
  emergencyContact1Email?: string;
  createdAt?: string;
}

export interface EcgReading {
  userId?: string;
  bpm?: number;
  rawValue?: number;
  rrInterval?: number;
  isAnomaly?: boolean;
  anomalyType?: string;
  stressLevel?: number;
  timestamp?: string;
}

export interface Alert {
  id?: string;
  userId?: string;
  alertType?: string;
  status?: string;
  lat?: number;
  lng?: number;
  createdAt?: string;
  resolvedAt?: string;
  timeline?: any[];
}

export interface ChatMessage {
  id?: string;
  userId?: string;
  message?: string;
  sender?: string;
  mediaUrl?: string;
  needsSupport?: boolean;
  timestamp?: string;
}

// FIXED: Always includes pranjal_001 as fallback
export function useAllPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = ref(db, "users");
    const ecgRef = query(ref(db, "ecg_readings"), limitToLast(500));

    let usersData: Record<string, Patient> = {};
    let ecgUserIds = new Set<string>();

    const mergeAndSet = () => {
      const merged: Patient[] = [];

      // Add all users from users collection
      Object.entries(usersData).forEach(([id, user]) => {
        if ((user as any).role !== "admin") {
          merged.push({ ...user, userId: id });
        }
      });

      // Add synthetic patients from ecg readings not in users
      ecgUserIds.forEach((uid) => {
        if (!usersData[uid]) {
          merged.push({
            userId: uid,
            name: uid,
            role: "patient",
            mode: "normal",
          });
        }
      });

      // Always ensure pranjal_001 is present
      if (!merged.find((p) => p.userId === "pranjal_001")) {
        merged.push({
          userId: "pranjal_001",
          name: "Pranjal (Pi)",
          role: "patient",
          mode: "normal",
        });
      }

      setPatients(merged.filter((p) => p.userId));
      setLoading(false);
    };

    const unsubUsers = onValue(usersRef, (snap) => {
      usersData = snap.val()
        ? (Map.from(Object.entries(snap.val())) as any)
        : {};
      usersData = snap.val() ?? {};
      mergeAndSet();
    });

    const unsubEcg = onValue(ecgRef, (snap) => {
      if (snap.val()) {
        Object.values(snap.val()).forEach((r: any) => {
          if (r?.userId) ecgUserIds.add(r.userId);
        });
      }
      mergeAndSet();
    });

    return () => {
      unsubUsers();
      unsubEcg();
    };
  }, []);

  return { data: patients, loading };
}

export function usePatientECG(userId: string, limitCount = 60) {
  const [data, setData] = useState<EcgReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const ecgRef = query(
      ref(db, "ecg_readings"),
      orderByChild("userId"),
      equalTo(userId),
      limitToLast(limitCount),
    );
    const unsub = onValue(ecgRef, (snap) => {
      if (!snap.val()) {
        setData([]);
        setLoading(false);
        return;
      }
      const readings = Object.entries(snap.val()).map(
        ([id, v]: [string, any]) => ({ ...v, id }),
      );
      readings.sort(
        (a, b) =>
          new Date(a.timestamp ?? 0).getTime() -
          new Date(b.timestamp ?? 0).getTime(),
      );
      setData(readings);
      setLoading(false);
    });
    return () => unsub();
  }, [userId, limitCount]);

  return { data, loading };
}

export function useActiveAlerts() {
  const [data, setData] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const alertRef = ref(db, "alerts");
    const unsub = onValue(alertRef, (snap) => {
      if (!snap.val()) {
        setData([]);
        setLoading(false);
        return;
      }
      const alerts = Object.entries(snap.val())
        .map(([id, v]: [string, any]) => ({ ...v, id }))
        .filter((a) => a.status !== "resolved")
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        );
      setData(alerts);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { data, loading };
}

export function useChatMessages(userId: string) {
  const [data, setData] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const chatRef = query(
      ref(db, "chat_messages"),
      orderByChild("userId"),
      equalTo(userId),
      limitToLast(50),
    );
    const unsub = onValue(chatRef, (snap) => {
      if (!snap.val()) {
        setData([]);
        setLoading(false);
        return;
      }
      const msgs = Object.entries(snap.val())
        .map(([id, v]: [string, any]) => ({ ...v, id }))
        .sort(
          (a, b) =>
            new Date(a.timestamp ?? 0).getTime() -
            new Date(b.timestamp ?? 0).getTime(),
        );
      setData(msgs);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  return { data, loading };
}

export function useUserProfile(userId: string) {
  const [data, setData] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) return;
    const unsub = onValue(ref(db, `users/${userId}`), (snap) => {
      setData(snap.val() ? { ...snap.val(), userId } : null);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);
  return { data, loading };
}

export function useLiveVitals(userId: string) {
  const [vitals, setVitals] = useState({
    bpm: 0,
    stress: 0,
    tremor: false,
    mode: "normal",
    connected: false,
  });
  useEffect(() => {
    if (!userId) return;
    const ecgRef = query(
      ref(db, "ecg_readings"),
      orderByChild("userId"),
      equalTo(userId),
      limitToLast(1),
    );
    const unsubEcg = onValue(ecgRef, (snap) => {
      if (!snap.val()) return;
      const vals = Object.values(snap.val()) as any[];
      const latest = vals[vals.length - 1];
      const connected = latest?.timestamp
        ? Date.now() - new Date(latest.timestamp).getTime() < 30000
        : false;
      setVitals((prev) => ({
        ...prev,
        bpm: latest?.bpm ?? 0,
        stress: latest?.stressLevel ?? 0,
        connected,
      }));
    });
    const userRef = ref(db, `users/${userId}`);
    const unsubUser = onValue(userRef, (snap) => {
      if (snap.val())
        setVitals((prev) => ({ ...prev, mode: snap.val()?.mode ?? "normal" }));
    });
    return () => {
      unsubEcg();
      unsubUser();
    };
  }, [userId]);
  return vitals;
}
```

---

## lib/nvidia-api.ts — NVIDIA NIM Integration

```typescript
// NVIDIA NIM API for medical AI (replaces/enhances Gemini)
// API Key from keys.env: <GEMINI_API_KEY>
// NVIDIA: get from build.nvidia.com — model: mistralai/mistral-7b-instruct-v0.3
// Base URL: https://integrate.api.nvidia.com/v1

const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "mistralai/mistral-7b-instruct-v0.3";

export async function askNvidiaAI(
  userMessage: string,
  healthContext: string,
  history: Array<{ role: string; content: string }> = [],
) {
  const systemPrompt = `You are Guardian Pulse Medical AI — a healthcare assistant.
You analyze ECG data, detect anomalies, and provide health insights.
Current patient context: ${healthContext}
Rules:
- Only answer health, ECG, cardiac, neurological, and emergency questions
- Never diagnose definitively — always recommend consulting a doctor
- For emergencies: immediately say "CALL 108 NOW"
- Be concise and clear — patient may be stressed`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-8),
    { role: "user", content: userMessage },
  ];

  // Try NVIDIA first, fallback to Gemini
  try {
    const response = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages,
        max_tokens: 512,
        temperature: 0.4,
        stream: false,
      }),
    });
    const data = await response.json();
    return (
      data.choices?.[0]?.message?.content ??
      "Unable to analyze. Please consult a doctor."
    );
  } catch {
    // Fallback to Gemini
    return await askGemini(userMessage, healthContext, history);
  }
}

async function askGemini(
  userMessage: string,
  healthContext: string,
  history: any[],
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${healthContext}\n\nUser: ${userMessage}` }],
          },
        ],
        generationConfig: { maxOutputTokens: 512, temperature: 0.4 },
      }),
    },
  );
  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    "Please consult a doctor."
  );
}
```

---

## middleware.ts (FIXED — no proxy conflict)

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublic = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) {
    const { userId } = await auth();
    if (!userId) return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo|.*\\..*).*)"],
};
```

---

## .env.local (template only — fill with real values privately)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<CLERK_PUBLISHABLE_KEY>
CLERK_SECRET_KEY=<CLERK_SECRET_KEY>
NEXT_PUBLIC_FIREBASE_API_KEY=<FIREBASE_API_KEY>
NEXT_PUBLIC_FIREBASE_DB_URL=<FIREBASE_DB_URL>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<FIREBASE_PROJECT_ID>
NEXT_PUBLIC_FIREBASE_APP_ID=<FIREBASE_APP_ID>
NEXT_PUBLIC_CLOUDFLARE_API=<CLOUDFLARE_API_URL>
GEMINI_API_KEY=<GEMINI_API_KEY>
NVIDIA_API_KEY=<NVIDIA_API_KEY>
RESEND_API_KEY=<RESEND_API_KEY>
TWILIO_ACCOUNT_SID=<TWILIO_ACCOUNT_SID>
TWILIO_AUTH_TOKEN=<TWILIO_AUTH_TOKEN>
TWILIO_PHONE=<TWILIO_PHONE>
```

---

## AFTER GENERATING — Build Commands

```bash
npm install
npm run build
npx vercel deploy --prod
```

Generate ALL files listed above. Every page must use Stitch MCP first.
Pure olive colors only. Zero TypeScript errors.
