# Guardian Pulse

Guardian Pulse is an advanced remote patient telemetry and diagnostic monitoring system designed to bridge the gap between patients and clinicians with real-time, high-fidelity data visualization. 

Powered by Next.js and Firebase, it provides near-instantaneous streaming of vital signs and a robust ecosystem for managing medical alerts, admin approvals, and patient data in a secure, responsive dark-themed dashboard environment.

## 🚀 Key Features

### 👩‍⚕️ Clinical Admin Dashboard
- **Live ECG Telemetry:** High-frequency (24 FPS) PQRST waveform monitoring that precisely simulates clinical-grade cardiac activity driven by live BPM data streams.
- **Historical Analysis:** Seamless toggle between real-time telemetry and aggregated historical line charts (1H, 24H, 7D, 30D views).
- **Patient Management & Deduplication:** Unified patient registry with intelligent email-based deduplication algorithms to ensure data consistency across multiple platforms or test sessions.
- **Audit Logs & Analytics:** Detailed system-wide logging and analytical views for overarching platform governance.

### 🛡️ Secure Admin Approval Workflow
- **Robust RBAC (Role-Based Access Control):** Role assignment is strictly managed. Users requesting administrative privileges land in a protective "Pending Admin" state.
- **Vetting Panel:** Existing super-admins maintain strict control by approving or rejecting requested elevations directly from the dedicated Admin Requests dashboard.

### 🩺 Patient Experience
- **Real-Time Diagnostics:** Live reflections of vital data, heart rhythm assessments, tremor levels, and seizure risk, exactly as viewed by the clinical staff.
- **Animated Data Feeds:** Continuous, glowing PQRST ECG tracings rendered natively in the browser using SVG filters and Recharts.
- **Integrated Support:** Direct chat connectivity and emergency contact modules built straight into the patient interface, firing `needsSupport` flags immediately to the clinician's alerts.

## 🛠 Tech Stack
- **Frontend:** Next.js (App Router), React, Tailwind CSS, Framer Motion
- **Data Visualization:** Recharts, Custom High-frequency SVG Hooking 
- **Backend / Real-time Database:** Firebase Realtime Database
- **Authentication:** Clerk Auth integratated with Firebase role ingestion

## ⚙️ Running Locally

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## 🔐 Licensing
Project Intellectual Property is strictly protected under a "No-License" / "All Rights Reserved" copyright notice. Viewing the repository is permitted, but the usage, reproduction, or deployment of the associated IP is restricted.
