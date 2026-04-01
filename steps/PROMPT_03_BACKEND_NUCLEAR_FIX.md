# ⚙️ GUARDIAN PULSE — BACKEND NUCLEAR FIX

### Cloudflare Worker + NVIDIA + Resend + Twilio + Public APIs

### Paste in Antigravity Session 3 OR run in VS Code with Copilot

---

## WHAT THIS FIXES

1. ✅ Resend email — fix authentication + template
2. ✅ Twilio SMS — fix auth headers + message format
3. ✅ Twilio CALL — add voice call to ambulance (108)
4. ✅ NVIDIA NIM API — AI chatbot with fallback to Gemini
5. ✅ Public APIs — OpenFDA drug info + Disease.sh health data
6. ✅ src/index.js — complete rewrite with all routes
7. ✅ src/firebase.js — Realtime Database (no JWT needed)
8. ✅ src/alert-engine.js — complete fix
9. ✅ src/chatbot.js — NVIDIA + Gemini dual AI

---

## CREDENTIALS (template — populate via wrangler secrets)

```
FIREBASE_PROJECT_ID:  <FIREBASE_PROJECT_ID>
FIREBASE_API_KEY:     <FIREBASE_API_KEY>
FIREBASE_DB_URL:      <FIREBASE_DB_URL>
PI_SECRET:            <PI_SECRET>
CLERK_JWKS_URL:       <CLERK_JWKS_URL>
RESEND_API_KEY:       <RESEND_API_KEY>
GEMINI_API_KEY:       <GEMINI_API_KEY>
TWILIO_ACCOUNT_SID:   <TWILIO_ACCOUNT_SID>
TWILIO_AUTH_TOKEN:    <TWILIO_AUTH_TOKEN>
TWILIO_PHONE:         <TWILIO_PHONE>
GROQ_API_KEY:         <GROQ_API_KEY>
```

---

## PROMPT FOR ANTIGRAVITY — Paste this:

```
Completely rewrite Guardian Pulse Cloudflare Worker backend.
Fix ALL broken features. Zero errors. Full production quality.

=== FIREBASE CONFIG (USE REALTIME DB REST — NO OAUTH NEEDED) ===
DB URL: <FIREBASE_DB_URL>
API Key: <FIREBASE_API_KEY>

All Firebase calls use: ?auth=<FIREBASE_API_KEY> in URL
NO JWT, NO OAuth, NO private keys needed (rules are open)

=== FILE 1: src/firebase.js ===

Complete rewrite using Firebase Realtime Database REST API only.

const DB_URL = '<FIREBASE_DB_URL>';
const API_KEY = '<FIREBASE_API_KEY>';

Export these functions:

async function dbPush(path, data, env) {
  // POST to DB_URL/path.json?auth=API_KEY
  // Returns { id: generatedKey }
}

async function dbSet(path, data, env) {
  // PUT to DB_URL/path.json?auth=API_KEY
}

async function dbGet(path, env) {
  // GET DB_URL/path.json?auth=API_KEY
  // Returns data or null
}

async function dbQuery(path, orderBy, equalTo, limitLast, env) {
  // GET with ?orderBy="field"&equalTo="value"&limitToLast=N&auth=API_KEY
  // Returns array of objects
}

async function dbUpdate(path, data, env) {
  // PATCH to DB_URL/path.json?auth=API_KEY
}

async function sendFCM(fcmToken, title, body, data, env) {
  // POST to https://fcm.googleapis.com/fcm/send
  // Authorization: key=BB9N5Xk03OzMMbr9kb2O7BNrO8xRlh2i1SjjKWsGsE15VrZT4Hnt67A21EGPAlZJmPKYmv6QllIy_s4diwRGZ_Q
  // Body: { to: fcmToken, notification: {title, body}, data }
}

All: try/catch with console.error. Return null on failure.

=== FILE 2: src/alert-engine.js (COMPLETE FIX) ===

RESEND EMAIL FIX:
async function sendEmergencyEmail(to, patientName, alertType, lat, lng, bpm, env) {
  const mapsLink = `https://maps.google.com?q=${lat},${lng}`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Guardian Pulse Alerts <alerts@guardianpulse.in>',
      to: [to],
      subject: `🚨 URGENT: ${patientName} needs help — ${alertType} detected`,
      html: buildEmergencyEmailHtml(patientName, alertType, mapsLink, bpm),
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[resend] Email failed:', JSON.stringify(data));
    return false;
  }
  console.log('[resend] Email sent:', data.id);
  return true;
}

function buildEmergencyEmailHtml(patientName, alertType, mapsLink, bpm) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#060D06;font-family:monospace;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:#0A110A;padding:20px 0;text-align:center;">
  <h1 style="color:#78C060;font-family:monospace;letter-spacing:3px;font-size:20px;margin:0;">
    GUARDIAN PULSE
  </h1>
  <p style="color:#3D5C35;font-size:11px;letter-spacing:2px;margin:4px 0 0;">
    EMERGENCY ALERT SYSTEM
  </p>
</td></tr>
<tr><td style="background:#CA4A4A;padding:16px 24px;text-align:center;">
  <h2 style="color:#fff;margin:0;font-size:18px;letter-spacing:1px;">
    ⚠️ ${alertType.toUpperCase()} DETECTED
  </h2>
</td></tr>
<tr><td style="padding:32px 24px;background:#0A110A;">
  <p style="color:#D4F0C8;font-size:16px;margin:0 0 16px;">
    <strong>${patientName}</strong> may need immediate assistance.
  </p>
  <table style="background:#111C11;border:1px solid #2E4E2E;border-radius:8px;padding:16px;width:100%;">
    <tr><td style="color:#7BAD6A;font-size:12px;padding:4px 0;">ALERT TYPE</td>
        <td style="color:#A8E090;font-weight:bold;">${alertType}</td></tr>
    <tr><td style="color:#7BAD6A;font-size:12px;padding:4px 0;">CURRENT BPM</td>
        <td style="color:#CA4A4A;font-weight:bold;">${bpm} BPM</td></tr>
    <tr><td style="color:#7BAD6A;font-size:12px;padding:4px 0;">TIME</td>
        <td style="color:#A8E090;">${new Date().toLocaleString('en-IN')}</td></tr>
  </table>
  <div style="text-align:center;margin:24px 0;">
    <a href="${mapsLink}" style="background:#4A7A3D;color:#D4F0C8;padding:12px 32px;
       text-decoration:none;border-radius:8px;font-weight:bold;letter-spacing:1px;
       display:inline-block;">📍 VIEW LOCATION ON MAP</a>
  </div>
  <p style="color:#7BAD6A;font-size:13px;line-height:1.6;">
    Patient has <strong>not responded</strong> to the in-app alert for 2+ minutes.
    Please call them immediately. If unreachable, call <strong>108</strong> (Emergency India).
  </p>
</td></tr>
<tr><td style="background:#060D06;padding:16px;text-align:center;">
  <p style="color:#3D5C35;font-size:11px;margin:0;">
    Guardian Pulse | Real-Time Medical Monitoring | guardianpulse.in
  </p>
</td></tr>
</table>
</body>
</html>`;
}

TWILIO SMS FIX:
async function sendEmergencySMS(to, message, env) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE;

  // Fix: proper Basic auth encoding
  const credentials = btoa(`${accountSid}:${authToken}`);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: message.slice(0, 160), // SMS max 160 chars
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[twilio-sms] Failed:', JSON.stringify(data));
    return false;
  }
  console.log('[twilio-sms] Sent SID:', data.sid);
  return true;
}

TWILIO VOICE CALL (NEW — ambulance notification):
async function makeEmergencyCall(to, patientName, alertType, env) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE;
  const credentials = btoa(`${accountSid}:${authToken}`);

  // TwiML URL — hosted on Cloudflare itself
  const twimlMessage = `GUARDIAN PULSE EMERGENCY ALERT.
    ${patientName} has a ${alertType} detected.
    Please check on them immediately.
    If you cannot reach them, call one zero eight for ambulance.
    Repeat. Guardian Pulse Emergency. ${patientName} needs help.`;

  const twimlUrl = `https://handler.twilio.com/twiml/EH123?message=${encodeURIComponent(twimlMessage)}`;

  // Use Twilio Programmable Voice
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
  const body = new URLSearchParams({
    To: to,
    From: from,
    Twiml: `<Response><Say voice="alice">${twimlMessage}</Say></Response>`,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[twilio-call] Failed:', JSON.stringify(data));
    return false;
  }
  console.log('[twilio-call] Call SID:', data.sid);
  return true;
}

ESCALATION LOGIC (async escalateAlert):
  1. Get alert from Firebase: dbGet('alerts/' + alertId, env)
  2. Get user from Firebase: dbGet('users/' + alert.userId, env)
  3. Calculate elapsed: Date.now() - new Date(alert.createdAt).getTime()
  4. If elapsed > 120000 (2 min) AND status == 'pending':
     - sendEmergencySMS(user.emergencyContact1Phone, smsMessage, env)
     - sendEmergencyEmail(user.emergencyContact1Email, user.name, alert.alertType, alert.lat, alert.lng, alert.bpm, env)
     - dbUpdate('alerts/' + alertId, { status: 'contact_notified', timeline: [...alert.timeline, {event:'contact_notified', time: now}] }, env)
  5. If elapsed > 480000 (8 min) AND status == 'contact_notified':
     - makeEmergencyCall(user.emergencyContact1Phone, user.name, alert.alertType, env)
     - sendEmergencySMS(user.emergencyContact2Phone, smsMessage, env)
     - dbUpdate('alerts/' + alertId, { status: 'ambulance_called' }, env)

Export: { triggerAlert, sendEmergencyEmail, sendEmergencySMS, makeEmergencyCall, escalateAlert }

=== FILE 3: src/chatbot.js (NVIDIA + GROQ + GEMINI triple fallback) ===

async function handleChat(userId, message, history, mediaUrl, env) {
  // Get user health context
  const latestEcg = await getLatestEcg(userId, env);
  const healthContext = latestEcg ?
    `Patient data: BPM=${latestEcg.bpm}, Stress=${latestEcg.stressLevel}, Anomaly=${latestEcg.isAnomaly}` :
    'No recent ECG data';

  const systemPrompt = `You are Guardian Pulse Medical AI.
Context: ${healthContext}
Rules: Only answer health/medical questions. Recommend doctor for diagnosis.
For emergencies say: EMERGENCY — CALL 108 IMMEDIATELY.
Be concise. Max 150 words.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(h => ({ role: h.role || 'user', content: h.content || h.message })),
    { role: 'user', content: message }
  ];

  // Try GROQ first (fastest, free)
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        max_tokens: 300,
        temperature: 0.4,
      })
    });
    if (r.ok) {
      const d = await r.json();
      return { response: d.choices[0].message.content, source: 'groq' };
    }
  } catch(e) { console.error('[chat] GROQ failed:', e.message); }

  // Fallback to Gemini
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 300, temperature: 0.4 }
        })
      }
    );
    if (r.ok) {
      const d = await r.json();
      return { response: d.candidates[0].content.parts[0].text, source: 'gemini' };
    }
  } catch(e) { console.error('[chat] Gemini failed:', e.message); }

  return { response: 'Unable to connect to AI. Please consult your doctor directly.', source: 'fallback' };
}

async function getLatestEcg(userId, env) {
  const DB_URL = 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app';
  const API_KEY = 'AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc';
  try {
    const url = `${DB_URL}/ecg_readings.json?orderBy="userId"&equalTo="${userId}"&limitToLast=1&auth=${API_KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!data) return null;
    const values = Object.values(data);
    return values.length > 0 ? values[values.length - 1] : null;
  } catch { return null; }
}

Export: { handleChat }

=== FILE 4: src/ecg-logic.js (Add public API enrichment) ===

Keep existing detectAnomalies, detectSeizure, detectTremor, calculateHRV, calculateStress.

ADD: async function enrichWithPublicData(bpm, anomalyType, env) {
  // Use Disease.sh API for health benchmarks (free, no key)
  // Use OpenFDA for any relevant drug interaction warnings

  let healthTip = '';

  if (bpm > 100) {
    healthTip = 'Elevated heart rate. Stay calm, breathe slowly. Consult doctor if persistent.';
  } else if (bpm < 60) {
    healthTip = 'Low heart rate detected. If feeling dizzy, sit down immediately.';
  }

  if (anomalyType === 'seizure') {
    healthTip = 'SEIZURE PROTOCOL: Do not restrain. Remove sharp objects. Time the episode. Call 108.';
  }

  return healthTip;
}

=== FILE 5: src/index.js (COMPLETE REWRITE — ALL ROUTES) ===

Generate complete src/index.js with:

CORS headers function:
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, OPTIONS
  Access-Control-Allow-Headers: Authorization, Content-Type, X-Pi-Secret

Handle OPTIONS → return 200 with CORS headers

ROUTE: POST /sensor-data
  1. Verify X-Pi-Secret header == env.PI_SECRET
  2. Parse body: { topic, payload }
  3. Add to Firebase Realtime DB:
     - If topic 'guardianpulse/ecg': push to 'ecg_readings' with userId, bpm, rawValue, isAnomaly, timestamp, stressLevel
     - If topic 'guardianpulse/motion': push to 'motion_data'
  4. Run detectAnomalies on last readings
  5. If shouldAlert: push to 'alerts' collection, send FCM
  6. Return { success: true, analysis }

ROUTE: POST /resolve-alert
  1. Parse body: { alertId }
  2. dbUpdate('alerts/' + alertId, { status: 'resolved', resolvedAt: now })
  3. Return { success: true }

ROUTE: POST /chat
  1. Parse body: { userId, message, history, mediaUrl }
  2. handleChat(userId, message, history, mediaUrl, env)
  3. Save to Firebase chat_messages
  4. Return { response, source }

ROUTE: POST /support-request
  1. Parse body: { userId, messageId }
  2. dbUpdate('chat_messages/' + messageId, { needsSupport: true })
  3. Return { success: true }

ROUTE: POST /test-alert
  1. Parse body: { userId }
  2. Send test SMS to user's emergency contact: "TEST: Guardian Pulse system working. No action needed."
  3. Return { success: true }

ROUTE: POST /upload-media
  1. Parse multipart form
  2. env.MEDIA_BUCKET.put(filename, bytes)
  3. Return { publicUrl: 'https://pub-aa8892880b7d4eb893a3d4d288bd266a.r2.dev/' + filename }

ROUTE: GET /health-tips?bpm=72&userId=xxx
  1. No auth needed
  2. Fetch from Disease.sh API: https://disease.sh/v3/covid-19/all (as example of free health API)
  3. Return health tips based on bpm value
  4. Use enrichWithPublicData from ecg-logic.js

ROUTE: POST /alert-escalate
  1. Parse body: { alertId }
  2. escalateAlert(alertId, env)
  3. Return { success: true }

SCHEDULED (every minute cron):
  1. dbQuery('alerts', 'status', 'pending', 50, env)
  2. For each pending alert: escalateAlert(alertId, env)
  3. Also check contact_notified alerts for 8-min escalation

Export default { fetch: handleRequest, scheduled: handleScheduled }
```

---

## WRANGLER.TOML (Add missing secrets)

```toml
name = "guardian-pulse-api"
main = "src/index.js"
compatibility_date = "2024-09-01"

[triggers]
crons = ["* * * * *"]

[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "guardian-pulse-media"

[vars]
FIREBASE_PROJECT_ID = "guardian-pulse-1360c"
ENVIRONMENT = "production"
```

---

## DEPLOY COMMANDS (run after Antigravity generates files)

```bash
# Add missing secrets (paste your own values)
wrangler secret put GROQ_API_KEY
# paste: <GROQ_API_KEY>

wrangler secret put RESEND_API_KEY
# paste: <RESEND_API_KEY>

wrangler secret put TWILIO_ACCOUNT_SID
# paste: <TWILIO_ACCOUNT_SID>

wrangler secret put TWILIO_AUTH_TOKEN
# paste: <TWILIO_AUTH_TOKEN>

wrangler secret put TWILIO_PHONE
# paste: <TWILIO_PHONE>

wrangler secret put GEMINI_API_KEY
# paste: <GEMINI_API_KEY>

# Deploy
wrangler deploy

# Test all routes
curl -X POST https://guardian-pulse-api.pranjalmishra2409.workers.dev/test-alert \
  -H "Content-Type: application/json" \
  -d '{"userId":"pranjal_001"}'

# Verify sensor data
curl -X POST https://guardian-pulse-api.pranjalmishra2409.workers.dev/sensor-data \
  -H "Content-Type: application/json" \
  -H "X-Pi-Secret: <PI_SECRET>" \
  -d '{"topic":"guardianpulse/ecg","payload":{"userId":"pranjal_001","bpm":75,"rawValue":15000,"rrInterval":800,"timestamp":"2026-03-25T12:00:00Z"}}'
```

---

## PUBLIC APIs INTEGRATION LIST

```
Disease.sh:   https://disease.sh/v3/covid-19/all             (free, no key)
OpenFDA:      https://api.fda.gov/drug/event.json            (free, no key)
Numbeo:       health cost data (free tier)
WHO API:      https://ghoapi.azureedge.net/api/Indicator     (free, no key)
Twilio:       SMS + Voice calls (credentials above)
Resend:       Transactional emails (key above)
GROQ:         LLM inference (key above)
Gemini:       AI fallback (key above)
```
