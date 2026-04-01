# Guardian Pulse

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
- **Heart Attacks / Cardiac Abnormalities:** Continuously tracking ECG patterns.
- **Seizure Attacks:** Identifying high-frequency, sudden, irregular body tremors.
- **PTSD / Panic Attacks:** Detecting sudden, severe spikes in physiological stress metrics.

---

## 🧠 Core System Workflow & Data Flow

Guardian Pulse employs a highly structured and optimized multi-layered IoT pipeline:

1. **Sensing Layer (Data Collection):**
   - **Hardware Input:** A Raspberry Pi 4B acts as the edge device, interfacing with an **ECG sensor (AD8232)** and a **Motion/Tremor sensor (MPU6050)**.
2. **Edge Processing (Microcontroller):**
   - The microcontroller filters and preliminary processes the raw sensor noise.
   - Using diagnostic rules heavily inspired by **trained MIT research datasets (MIT-BIH Arrhythmia Database)**, it ensures high-accuracy base metrics.
3. **Transmission Layer:**
   - The verified telemetry data is published every single second using the lightweight **MQTT protocol** to a **HiveMQ Cloud Broker**.
4. **Backend Processing & Cloud Analytics:**
   - **Cloudflare Workers** (edge functions) act as the system's brain. They ingest data, finalize anomaly detection (e.g. ECG arrhythmias, tremor signatures), and run the immediate alert logic.
   - Processed events and historical health logs are immediately written to **Firebase Firestore** and **Cloudflare R2** for fast, reliable storage.
5. **Presentation Layer (App & Web):**
   - **Mobile App (Flutter):** Provides users and family members continuous monitoring, graphical dashboards, and settings.
   - **Admin Dashboard (Next.js):** Hosted over Vercel, providing analytical views for caretakers or administrators.
6. **Emergency & Alerting Protocol:**
   - When an acute anomaly (like a seizure or heart attack) is detected, automated systems are triggered.
   - **Firebase FCM** sends instant Push Notifications to the designated family members.
   - **Resend** fires emergency priority emails.
   - **Twilio** triggers SMS and voice calls.
   - **Live Location Tracing:** Tracks the patient continuously allowing direct integration for **calling ambulances** or routing responders directly to the patient's coordinates.
7. **AI & Support:**
   - An intelligent **Gemini 1.5 Flash Chatbot with RAG** architecture empowers users to understand symptom histories and query past health logs contextually.

---

## 📂 Project Structure

```
guardian-pulse/
├── 📱 app/                    ← Flutter Mobile App (Android/iOS)
├── 🌐 website/                ← Next.js Admin Dashboard (www.guardianpulse.in)
├── ⚙️ backend/                ← Cloudflare Workers Edge Functions
├── 🍓 raspberry-pi/           ← Python Edge Computing & MQTT Publishing
└── 📄 docs/ & steps/          ← Internal Architectural Planning and Documentation
```

## 🛠️ Tech Stack & Integrations

- **IoT Edge:** Raspberry Pi 4B, Python, MPU6050, AD8232
- **Message Broker:** HiveMQ Cloud (MQTT)
- **Backend Edge Computing:** Cloudflare Workers
- **Database & Storage:** Firebase (Firestore, FCM), Cloudflare R2
- **Front-End Clients:** Flutter (App), Next.js (Web), Vercel
- **Authentication:** Clerk Auth
- **AI & Integrations:** Gemini 1.5 Flash (AI), Twilio (SMS/Voice), Resend (Email)
