# 🔥 FILE 02 — FIREBASE DATABASE + RASPBERRY PI
### Hinglish Guide | Guardian Pulse

---

## FIREBASE FIRESTORE — DATABASE STRUCTURE

**Firestore kya hota hai?** — Ek drawer system jaise. Har drawer ek "collection" hai, har file ek "document" hai.

Ye collections banao (Firebase Console → Firestore → Start Collection):

### Collection 1: `users`
```
users/
  └── {userId}/              ← Clerk ka user ID
        name: "Rahul Sharma"
        email: "rahul@gmail.com"
        phone: "+91-9876543210"
        emergencyContact1: "+91-9999999999"
        emergencyContact2: "+91-8888888888"
        emergencyEmail: "mom@gmail.com"
        mode: "normal"         ← "normal" | "sleep" | "parkinson"
        deviceId: "pi-001"
        createdAt: timestamp
```

### Collection 2: `ecg_readings`
```
ecg_readings/
  └── {autoId}/
        userId: "clerk_user_id"
        bpm: 72
        rawValue: 512.5
        isAnomaly: false
        anomalyType: null      ← "tachycardia" | "bradycardia" | "seizure"
        timestamp: timestamp
```

### Collection 3: `motion_data`
```
motion_data/
  └── {autoId}/
        userId: "clerk_user_id"
        accelX: 0.02
        accelY: -0.01
        accelZ: 9.8
        gyroX: 0.001
        gyroY: 0.002
        gyroZ: -0.001
        tremorDetected: false
        tremorFrequency: 0.0   ← Hz mein
        stressLevel: 25        ← 0-100
        timestamp: timestamp
```

### Collection 4: `alerts`
```
alerts/
  └── {autoId}/
        userId: "clerk_user_id"
        alertType: "seizure"   ← "seizure"|"panic"|"ptsd"|"cardiac"|"parkinson"
        status: "pending"      ← "pending"|"user_ok"|"contact_notified"|"ambulance"
        lat: 28.6139
        lng: 77.2090
        createdAt: timestamp
        resolvedAt: null
        timeline: [            ← Array of events
          {event: "detected", time: timestamp},
          {event: "user_notified", time: timestamp},
          {event: "contact_sms_sent", time: timestamp}
        ]
```

### Collection 5: `chat_messages`
```
chat_messages/
  └── {autoId}/
        userId: "clerk_user_id"
        message: "Mera dil tez dhadak raha hai"
        sender: "user"         ← "user" | "ai" | "support"
        mediaUrl: null         ← Image/video ka Firebase Storage URL
        needsSupport: false    ← true hone pe admin ko notification
        timestamp: timestamp
```

### Collection 6: `rag_documents`
```
rag_documents/
  └── {autoId}/
        sourceFile: "mit-seizure-paper.pdf"
        chunkText: "ECG morphology during seizure..."
        embedding: [0.23, -0.45, ...]   ← 768 numbers ka array
        createdAt: timestamp
```

---

## FIRESTORE RULES — SECURITY

Firebase Console → Firestore → Rules → Paste karo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users apna hi data dekh sakते hain
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // ECG readings — sirf apna data
    match /ecg_readings/{docId} {
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      // Write sirf backend (service account) kar sakta hai
      allow write: if false;
    }
    
    // Same for motion_data
    match /motion_data/{docId} {
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      allow write: if false;
    }
    
    // Alerts
    match /alerts/{docId} {
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      allow write: if false;
    }
    
    // Chat messages
    match /chat_messages/{docId} {
      allow read, write: if request.auth != null && 
                            resource.data.userId == request.auth.uid;
    }
  }
}
```

> ⚠️ Backend (Cloudflare Worker) **service account** use karta hai jo in rules ko bypass karta hai → Wo sab kuch read/write kar sakta hai.

---

## 🍓 RASPBERRY PI SETUP

### Install karo Pi pe:
Terminal open karo Pi pe aur ek-ek karke chalao:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-smbus i2c-tools -y
pip3 install paho-mqtt firebase-admin RPi.GPIO spidev
```

### I2C Enable karo (MPU6050 ke liye):
```bash
sudo raspi-config
```
Interface Options → I2C → Enable → Finish → Reboot

### Test karo ki MPU6050 detect ho raha hai:
```bash
sudo i2cdetect -y 1
```
`0x68` address dikhna chahiye → MPU6050 connected hai ✅

---

## RASPBERRY PI PYTHON SCRIPT — VS CODE COPILOT PROMPT

**VS Code kholo → Copilot ko ye prompt do:**

```
Create a complete Python script for Raspberry Pi 4B called "sensor_publisher.py"

HARDWARE:
- ECG sensor AD8232 connected via MCP3008 ADC on SPI (CS pin GPIO 8)
- MPU6050 accelerometer/gyroscope on I2C address 0x68

WHAT IT SHOULD DO:
1. Read ECG voltage from MCP3008 channel 0 at 250 samples/second
2. Detect R-peaks in ECG signal using Pan-Tompkins algorithm (simplified)
3. Calculate BPM from R-peak intervals
4. Read accelerometer X, Y, Z and gyroscope X, Y, Z from MPU6050 every 50ms
5. Every 1 second, publish TWO JSON messages to HiveMQ Cloud via MQTT:

   Topic: "guardianpulse/ecg"
   Payload: {
     "userId": USER_ID (from config),
     "bpm": 72,
     "rawValue": 512.5,
     "rrInterval": 833,
     "timestamp": "ISO-8601 string"
   }

   Topic: "guardianpulse/motion"  
   Payload: {
     "userId": USER_ID,
     "accelX": 0.02, "accelY": -0.01, "accelZ": 9.8,
     "gyroX": 0.001, "gyroY": 0.002, "gyroZ": -0.001,
     "timestamp": "ISO-8601 string"
   }

MQTT CONFIG (read from environment variables):
   BROKER = os.environ['HIVEMQ_HOST']
   PORT = 8883  (SSL)
   USERNAME = os.environ['HIVEMQ_USERNAME']
   PASSWORD = os.environ['HIVEMQ_PASSWORD']

REQUIREMENTS:
- SSL/TLS connection (port 8883)
- Auto-reconnect if connection drops (try every 5 seconds)
- Print each publish to console with timestamp
- Handle keyboard interrupt gracefully (Ctrl+C)
- Store config in a separate config.py file

Use paho-mqtt library. Add detailed comments explaining each section.
```

### Pi pe environment variables set karo:
```bash
echo 'export HIVEMQ_HOST="your-cluster.hivemq.cloud"' >> ~/.bashrc
echo 'export HIVEMQ_USERNAME="guardianpulse-pi"' >> ~/.bashrc
echo 'export HIVEMQ_PASSWORD="your-password"' >> ~/.bashrc
source ~/.bashrc
```

### Auto-start on boot:
```bash
sudo nano /etc/systemd/system/guardian-pulse.service
```

Paste karo:
```ini
[Unit]
Description=Guardian Pulse Sensor Publisher
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/guardian-pulse
ExecStart=/usr/bin/python3 sensor_publisher.py
Restart=always
RestartSec=5
EnvironmentFile=/home/pi/guardian-pulse/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable guardian-pulse
sudo systemctl start guardian-pulse
sudo systemctl status guardian-pulse  # Green hona chahiye ✅
```

---

## HIVEMQ → CLOUDFLARE BRIDGE (Data Forward Karna)

**Problem:** HiveMQ MQTT data receive karta hai, but Cloudflare Worker HTTP expect karta hai.
**Solution:** HiveMQ ka built-in Webhook integration use karo.

1. HiveMQ Console → **Integrations** → **"Create Integration"**
2. Type: **HTTP Webhook**
3. Settings:
   ```
   URL: https://guardian-pulse-api.YOUR-NAME.workers.dev/sensor-data
   Topic Filter: guardianpulse/#
   HTTP Method: POST
   ```
4. Save → Activate

Ab jab bhi Pi data publish karta hai → HiveMQ automatically Cloudflare Worker ko forward karta hai ✅
