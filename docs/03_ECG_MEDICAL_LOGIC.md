# 🫀 FILE 03 — ECG + MEDICAL DETECTION LOGIC
### Research-based thresholds | Guardian Pulse

---

## SENSOR SE KYA MILTA HAI — KYA DETECT HOGA

| Sensor | Data | Kya detect hoga |
|--------|------|-----------------|
| ECG (AD8232) | Dil ki electrical activity | BPM, arrhythmia, seizure, cardiac emergency |
| MPU6050 | Acceleration + Gyroscope | Tremor, Parkinson's, panic body shake |
| Dono milake | Combined analysis | Stress level, PTSD, overall health score |

---

## ECG THRESHOLDS — NORMAL vs DANGER
*Source: American Heart Association (AHA) Guidelines*

```
NORMAL BPM:           60 - 100       → Sab theek hai
BRADYCARDIA (slow):   < 50 BPM       → WARNING ⚠️
TACHYCARDIA (fast):   > 130 BPM      → WARNING ⚠️  
SEVERE:               > 150 BPM      → ALERT 🔴
EMERGENCY:            < 40 ya > 180  → CALL AMBULANCE 🚨

NORMAL QRS WIDTH:     80 - 120 ms    → Normal heartbeat shape
WIDE QRS:             > 120 ms       → Possible heart block
NORMAL PR INTERVAL:   120 - 200 ms   → Normal conduction
ABNORMAL PR:          > 200 ms       → AV Block warning
```

---

## SEIZURE DETECT KARNA

Seizure ke time kya hota hai:
1. Body mein achanak violent movement (MPU6050 mein high acceleration)
2. ECG irregular ho jata hai (muscle activity se noise)

**Algorithm — Copilot ke liye prompt (File 04 mein):**

```
Seizure flag tab aata hai jab:

Step 1: "Jerk" calculate karo (sudden acceleration change)
  jerk = sqrt((ax2-ax1)² + (ay2-ay1)² + (az2-az1)²) / time_delta

Step 2: Seizure probable agar:
  → jerk > 15 m/s³ (violent movement)
  AND
  → Ye pattern 10 seconds mein 3+ baar repeat ho
  AND
  → ECG BPM achanak 30+ BPM jump kare baseline se

Step 3: ECG artifact confirm:
  → ECG signal ka standard deviation > 3x normal
  → SEIZURE DETECTED ✅
```

---

## PARKINSON'S TREMOR DETECT KARNA
*Source: Movement Disorder Society Guidelines*

Parkinson's tremor ki special frequency hoti hai: **4-6 Hz** (4 se 6 baar/second kaanpna)

```
Step 1: MPU6050 se 5 second ka data lo
Step 2: FFT (frequency analysis) lagao
Step 3: Agar dominant frequency 4-6 Hz hai
  AND amplitude > 0.5 m/s²
  AND REST mein hai (chalna nahi — walking 1-2 Hz hoti hai)
  → PARKINSON TREMOR DETECTED

Normal walking: 1-2 Hz (clearly alag)
Anxiety tremor: 8-12 Hz (alag frequency)
Parkinson's: 4-6 Hz, bilkul specific
```

**PARKINSON MODE mein extra check:**
- Rigidity: Gyroscope mein limited range of motion
- Bradykinesia: Har movement slow (low velocity)
- Freezing: Achanak motion band ho jaye

---

## PANIC ATTACK DETECT KARNA

```
PANIC ATTACK SCORE (0-100 calculate karo):

+40 points: BPM 30+ jump kiya 30 seconds mein
+30 points: ECG baseline wander frequency 0.15-0.5 Hz (rapid breathing)
+20 points: MPU6050 mein 8-12 Hz tremor
+10 points: BPM > 100, 60 seconds se zyada

Score > 60 → PANIC WARNING ⚠️
Score > 80 → PANIC ALERT 🔴 (emergency contact notify)
```

---

## PTSD EPISODE DETECT KARNA

```
PTSD signs in data:
→ HRV (Heart Rate Variability) suddenly drop ho
→ BPM wildly oscillate kare (upar-neeche-upar pattern)
→ Parkinson Mode mein: startle response check karo
   (sudden high jerk → phir freeze/no motion)

HRV calculate karna:
RMSSD = sqrt(mean of squared differences between RR intervals)

Normal RMSSD: 20-50 ms
PTSD warning: RMSSD < 15 ms + high BPM + motion spike
```

---

## STRESS LEVEL FORMULA (0-100)

```javascript
// Ye function Cloudflare Worker mein use hoga

function calculateStressLevel(bpm, hrv, tremorIntensity, baselineBpm) {
  let stress = 0;
  
  // Heart rate contribution (40%)
  const bpmDeviation = Math.abs(bpm - baselineBpm) / baselineBpm;
  stress += Math.min(bpmDeviation * 40, 40);
  
  // HRV contribution (40%) — lower HRV = more stress
  const normalHRV = 35; // milliseconds
  const hrvStress = Math.max(0, (normalHRV - hrv) / normalHRV) * 40;
  stress += hrvStress;
  
  // Tremor contribution (20%)
  stress += Math.min(tremorIntensity * 20, 20);
  
  return Math.min(Math.round(stress), 100);
}
```

---

## ALERT ESCALATION TIMELINE

```
T + 0:00  → Anomaly detected by backend
T + 0:05  → Firebase FCM push notification to app:
             "⚠️ Are you okay? Tap to confirm"
             App mein full-screen dialog aata hai
             2 minute ka countdown shuru

T + 2:00  → User ne respond nahi kiya
             → Emergency Contact 1 ko SMS (Twilio)
             → Emergency email bheji (Resend)
             → Message: "ALERT: [Name] ko help chahiye. Location: [Maps Link]"
             → 8 minute ka countdown shuru

T + 8:00  → Emergency contact ne bhi respond nahi kiya
             → Ambulance call (Twilio Voice — 108 India)
             → Sab contacts ko email: "Ambulance bulai ja rahi hai"
             → Location real-time track hoti rehti hai

T + 8:00  → SPECIAL CASE: Emergency contact ne respond kiya
             BUT user still nahi → ALSO ambulance call
             → Contacts ko batao: "Contact milgaya, ambulance bhi bheji"

Location tracking:
→ Har 30 second pe GPS collect karo (geolocator package)
→ Firebase mein store karo alerts collection mein
→ Google Maps link: https://maps.google.com?q=LAT,LNG
→ Contacts ko ye link SMS/email mein bhejna
```

---

## TREMOR FREQUENCY QUICK REFERENCE

| Frequency | Matlab |
|-----------|--------|
| 0-2 Hz | Normal chalana/movement |
| 2-4 Hz | Mild, fatigue ho sakta hai |
| **4-6 Hz** | **Parkinson's tremor** |
| 6-12 Hz | Panic/anxiety tremor |
| >12 Hz | Seizure ka artifact |
