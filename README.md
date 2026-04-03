# 🛡️ Guardian Pulse

**Domain:** [www.guardianpulse.in](https://www.guardianpulse.in)

## ⚖️ Legal & Important Notice

**Copyright (c) 2026 Pranjal Mishra. All Rights Reserved.**

> [!WARNING]
> **View Only License:** This repository and its source code do not contain any Open Source License (like MIT, GPL, or Apache). This code is strictly provided for **viewing** to understand the concept, code quality, component structuring, and logic behind the platform.
> No individual or entity is legally permitted to copy, modify, distribute, or use this code for their own applications, projects, or profit without explicit written permission.

---

## 🩺 Overview

**Guardian Pulse** is a proactive, life-saving predictive health monitoring platform. Far beyond a step counter, it is an advanced IoT, Web, and Mobile application ecosystem meticulously designed for remote emergency health tracking.

The platform specializes in detecting life-threatening physiological events such as:
- 🫀 **Heart Attacks / Cardiac Abnormalities:** Continuously tracking ECG patterns.
- 🧠 **Seizure Attacks:** Identifying high-frequency, sudden, irregular body tremors.
- 🫁 **PTSD / Panic Attacks:** Detecting sudden, severe spikes in physiological stress metrics.

---

## 🏗️ System Architecture & Data Flow

Guardian Pulse employs a highly structured and optimized multi-layered IoT pipeline to ensure ultra-low latency alerts:

### 1. Sensing Layer (Data Collection)
- **Hardware Input:** A Raspberry Pi 4B acts as the edge device, interfacing with an **ECG sensor (AD8232)** and a **Motion/Tremor sensor (MPU6050)**.

### 2. Edge Processing (Microcontroller)
- The local processor filters and performs preliminary noise-reduction on the raw sensor data.
- Diagnostic rules—highly inspired by **MIT-BIH Arrhythmia Database** research—ensure high-accuracy base metrics before they leave the edge.

### 3. Transmission Layer
- Telemetry data is published every computing second using the lightweight **MQTT protocol** to a **HiveMQ Cloud Broker**, ensuring reliable IoT message delivery.

### 4. Backend Processing & Cloud Analytics
- **Cloudflare Workers** (serverless edge functions) act as the system's analytical brain. They ingest data from the broker, execute anomaly detection algorithms (e.g., ECG arrhythmias, tremor signatures), and run immediate alert logic.
- Processed events and historical health logs are instantly written to **Firebase Firestore** and **Cloudflare R2** for fast, reliable, and scalable storage.

### 5. Presentation Layer (App & Web)
- **📱 Mobile App (Flutter):** Provides users and family members continuous monitoring, graphical dashboards, and settings management.
- **🌐 Admin Dashboard (Next.js):** Hosted on Vercel, providing comprehensive analytical views and patient management for caretakers or medical administrators.

### 6. Emergency & Alerting Protocol
When an acute anomaly is detected, automated defense systems are triggered immediately:
- 🔔 **Firebase FCM:** Sends instant Push Notifications to designated family members.
- 📧 **Resend:** Fires off emergency priority emails.
- 📞 **Twilio:** Triggers immediate SMS alerts and automated voice calls.
- 📍 **Live Location Tracing:** Tracks the patient continuously, allowing direct integration for **calling ambulances** or routing first responders directly to the patient's coordinates.

### 7. AI Diagnostics & Support
- An intelligent **Gemini 1.5 Flash Chatbot with RAG** architecture empowers users to understand symptom histories, analyze health trends, and query past health logs contextually.

---

## 📥 Cloning & Access

While this repository operates under a **View Only** license, you can clone the source code locally for code review, inspection, and architectural analysis:

**Using Git (HTTPS):**
```bash
git clone https://github.com/Pranjal240/GUARDIAN-PULSE-.git
```

**Using GitHub CLI:**
```bash
gh repo clone Pranjal240/GUARDIAN-PULSE-
```

---

## 📂 Project Structure

The monorepo structure is organized to separate concerns across edge, backend, and frontend applications:

```text
guardian-pulse/
├── 📱 app/                    ← Flutter Mobile App
│   ├── lib/                   # Dart source code (UI, State, Services)
│   ├── android/               # Android-specific build files
│   └── ios/                   # iOS-specific build files
├── 🌐 website/                ← Next.js Admin Dashboard
│   ├── src/                   # React components, Next.js App Router, utilities
│   ├── public/                # Static assets
│   └── scripts/               # Build and setup scripts
├── ⚙️ backend/                ← Cloudflare Workers Edge Functions
│   ├── src/                   # Serverless edge function logic
│   └── wrangler.toml          # Cloudflare deployment configuration
├── 🍓 raspberry-pi/           ← Edge Computing & MQTT
│   └── sensor_publisher.py    # Python script for ECG & Motion data publishing
├── 📄 docs/                   ← Internal Project Documentation
└── 📄 steps/                  ← Architectural Planning & Setup Steps
```

---

## 🛠️ Tech Stack & Integrations

Our modern, resilient, and highly available technology stack includes:

### Edge & IoT
- **Hardware:** Raspberry Pi 4B, MPU6050 (Motion), AD8232 (ECG)
- **Software:** Python IoT Client
- **Broker:** HiveMQ Cloud (MQTT)

### Backend & Cloud Infrastructure
- **Compute:** Cloudflare Workers (Edge Serverless)
- **Database:** Firebase (Firestore)
- **Object Storage:** Cloudflare R2
- **Auth:** Clerk Authentication

### Frontend Platforms & Security
- **Mobile:** Flutter / Dart (Cross-platform Android & iOS)
- **Web Admin Portal:** Next.js (App Router), React, Tailwind CSS, Framer Motion, Recharts
- **Security & Authorization:** A rigorous role-assignment architecture. New users requesting admin privileges are placed in a `pending_admin` queue and must be explicitly approved/verified by an existing Administrator via a secure approval dashboard before accessing sensitive patient analytics.
- **Analytics Engine:** Recharts-powered interactive analytics dashboard featuring BPM distribution histograms, system health uptime, active alert trends, and live responsive monitoring.
- **Audit Logging:** Centralized, timestamped tracking of all administrative actions (approvals, rejections, anomaly clearances) preventing unauthorized or untraceable data manipulation.

### Alerting & AI
- **LLM / AI:** Gemini 1.5 Flash (RAG Infrastructure)
- **Communication:** Twilio (SMS/Voice), Resend (Email), Firebase Cloud Messaging (Push)

---

> *Built with resilience to monitor, alert, and protect lives.*
