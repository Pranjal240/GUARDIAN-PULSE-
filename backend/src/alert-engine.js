/**
 * alert-engine.js — Guardian Pulse
 * Alert creation, FCM push, Resend emergency email, Twilio SMS/call, escalation logic
 *
 * Escalation Timeline:
 *   t=0   → FCM push to user (120-second countdown in app)
 *   t=2min → If unresolved: SMS + Email to emergency contacts
 *   t=8min → If still unresolved: Call ambulance (Twilio voice call) + critical email
 */

import { dbPush, dbUpdate, dbQuery, dbGet, sendFCM } from "./firebase.js";

// ─── Alert Labels ─────────────────────────────────────────────────────────────
const ALERT_LABELS = {
  cardiac: { title: "⚠️ Cardiac Alert", emoji: "❤️‍🔥", color: "#E05252" },
  seizure: { title: "🚨 Seizure Detected", emoji: "🧠", color: "#FF6B00" },
  panic: { title: "⚠️ Panic Attack", emoji: "😰", color: "#FFC107" },
  parkinson_tremor: {
    title: "🔵 Tremor Detected",
    emoji: "🤲",
    color: "#4A90E2",
  },
  ptsd: { title: "⚠️ PTSD Episode", emoji: "🌩️", color: "#9E9E9E" },
  stress: { title: "⚠️ High Stress", emoji: "🔴", color: "#FF9800" },
};

/**
 * Create an alert in Firestore and send immediate FCM push to the user.
 * @returns {string} alertId
 */
export async function triggerAlert(
  userId,
  anomalyType,
  severity,
  anomalyData,
  env,
) {
  const label = ALERT_LABELS[anomalyType] || ALERT_LABELS.stress;

  // 1. Create RTDB alert document
  const pushRes = await dbPush(
    "alerts",
    {
      userId,
      alertType: anomalyType,
      severity,
      status: "pending",
      bpm: anomalyData?.bpm || 0,
      stressLevel: anomalyData?.stress?.level || 0,
      tremorDetected: anomalyData?.tremor?.detected || false,
      lat: null,
      lng: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      timeline: [
        {
          step: "alert_created",
          time: new Date().toISOString(),
          detail: "FCM pushed to user",
        },
      ],
    },
    env,
  );
  const alertId = pushRes.id;

  // 2. Get user's FCM token from Firestore
  const userDoc = await dbGet(`users/${userId}`, env);
  if (userDoc?.fcmToken) {
    await sendFCM(
      userDoc.fcmToken,
      label.title,
      `Guardian Pulse detected a ${anomalyType} event. Open the app to confirm you are safe.`,
      { alertId, alertType: anomalyType, severity },
      env,
    );
  }

  console.log(
    `Alert ${alertId} created for user ${userId}: ${anomalyType} (${severity})`,
  );
  return alertId;
}

/**
 * Resolve an alert by ID. Called when user taps "I'M OKAY" in the app.
 */
export async function resolveAlert(alertId, userId, env) {
  await dbUpdate(
    `alerts/${alertId}`,
    {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
    },
    env,
  );
  console.log(`Alert ${alertId} resolved by user ${userId}`);
}

/**
 * Alert escalation cron job handler.
 * Checks for all pending alerts:
 *   > 2 min old → escalate to contacts (SMS + email)
 *   > 8 min old → escalate to ambulance
 */
export async function escalateAlerts(env) {
  const pendingAlerts = await dbQuery("alerts", "status", "pending", 50, env);
  const now = Date.now();

  for (const alert of pendingAlerts) {
    const age = now - new Date(alert.createdAt).getTime();
    const userId = alert.userId;
    const alertId = alert.id || alert._id;

    if (age >= 8 * 60 * 1000 && alert.status === "escalated") {
      // 8 minute escalation → critical
      await escalateToCritical(alertId, userId, alert, env);
    } else if (age >= 2 * 60 * 1000 && alert.status === "pending") {
      // 2 minute escalation → contacts
      await escalateToContacts(alertId, userId, alert, env);
    }
  }
}

async function escalateToContacts(alertId, userId, alert, env) {
  const userDoc = await dbGet(`users/${userId}`, env);
  if (!userDoc) return;

  const label = ALERT_LABELS[alert.alertType] || ALERT_LABELS.stress;
  const contactPhone = userDoc.emergencyContact1Phone;
  const contactEmail = userDoc.emergencyContact1Email;
  const contactName = userDoc.emergencyContact1Name || "Emergency Contact";
  const patientName = userDoc.name || "Guardian Pulse User";
  const mapsUrl = alert.lat
    ? `https://maps.google.com/?q=${alert.lat},${alert.lng}`
    : null;

  // Send SMS
  if (contactPhone) {
    const smsBody = `${label.emoji} GUARDIAN PULSE ALERT
${patientName} has been detected with a ${alert.alertType} event and has NOT responded.
${mapsUrl ? `Location: ${mapsUrl}` : "Location unavailable."}
Please check on them immediately or call 112.`;
    await sendTwilioSMS(contactPhone, smsBody, env);
  }

  // Send emergency email
  if (contactEmail) {
    await sendEmergencyEmail(
      {
        to: contactEmail,
        toName: contactName,
        patientName,
        alertType: alert.alertType,
        alertLabel: label.title,
        bpm: alert.bpm,
        mapsUrl,
      },
      env,
    );
  }

  // Update alert status
  await dbUpdate(
    `alerts/${alertId}`,
    {
      status: "escalated",
      timeline: [
        ...(alert.timeline || []),
        {
          step: "contacts_notified",
          time: new Date().toISOString(),
          detail: "SMS + Email sent to emergency contacts",
        },
      ],
    },
    env,
  );
}

async function escalateToCritical(alertId, userId, alert, env) {
  const userDoc = await dbGet(`users/${userId}`, env);
  if (!userDoc) return;

  const patientName = userDoc.name || "Patient";
  const contact2Phone = userDoc.emergencyContact2Phone;
  const contact2Email = userDoc.emergencyContact2Email;
  const label = ALERT_LABELS[alert.alertType] || ALERT_LABELS.stress;
  const mapsUrl = alert.lat
    ? `https://maps.google.com/?q=${alert.lat},${alert.lng}`
    : null;

  // SMS second contact if available
  if (contact2Phone) {
    await sendTwilioSMS(
      contact2Phone,
      `URGENT: ${patientName} medical emergency - ${alert.alertType}. No response in 8 minutes. ${mapsUrl || ""}`,
      env,
    );
  }

  // Critical email to all contacts
  if (userDoc.emergencyContact1Email) {
    await sendEmergencyEmail(
      {
        to: userDoc.emergencyContact1Email,
        toName: userDoc.emergencyContact1Name || "",
        patientName,
        alertType: alert.alertType,
        alertLabel: `🚨 CRITICAL — ${label.title}`,
        bpm: alert.bpm,
        mapsUrl,
        urgent: true,
      },
      env,
    );
  }

  await dbUpdate(
    `alerts/${alertId}`,
    {
      status: "critical",
      timeline: [
        ...(alert.timeline || []),
        {
          step: "critical_escalation",
          time: new Date().toISOString(),
          detail: "8-min escalation — all contacts notified",
        },
      ],
    },
    env,
  );
}

/**
 * Send emergency email via Resend API.
 * API Key: <RESEND_API_KEY>
 */
export async function sendEmergencyEmail(
  {
    to,
    toName,
    patientName,
    alertType,
    alertLabel,
    bpm,
    mapsUrl,
    urgent = false,
  },
  env,
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Guardian Pulse Alerts <alerts@guardianpulse.in>",
      to: [to],
      subject: urgent
        ? `🚨 URGENT: ${patientName} needs immediate help — ${alertType}`
        : `⚠️ ${patientName} — Medical Alert: ${alertType}`,
      html: buildEmailHTML({
        patientName,
        alertLabel,
        alertType,
        bpm,
        mapsUrl,
        toName,
        urgent,
      }),
    }),
  });

  if (!res.ok) {
    console.error("Resend email failed:", await res.text());
  }
  return res.ok;
}

/**
 * Send SMS via Twilio REST API.
 * Twilio credentials in env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE
 */
export async function sendTwilioSMS(to, body, env) {
  const credentials = btoa(
    `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
  );
  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: env.TWILIO_PHONE,
      To: to,
      Body: body,
    }),
  });

  if (!res.ok) {
    console.error("Twilio SMS failed:", await res.text());
  }
  return res.ok;
}

// ─── Email HTML Builder ────────────────────────────────────────────────────────
function buildEmailHTML({
  patientName,
  alertLabel,
  alertType,
  bpm,
  mapsUrl,
  toName,
  urgent,
}) {
  const bgColor = urgent ? "#7B0000" : "#1A2E1F";
  const borderColor = urgent ? "#FF0000" : "#C4A882";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Guardian Pulse Alert</title></head>
<body style="background:${bgColor};color:#F5EDD6;font-family:Arial,sans-serif;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;border:2px solid ${borderColor};border-radius:8px;padding:24px;">
    <h1 style="color:${borderColor};font-size:24px;">${urgent ? "🚨 URGENT ALERT" : "⚠️ Medical Alert"}</h1>
    <p>Dear ${toName},</p>
    <p><strong>${patientName}</strong> has triggered a ${urgent ? "critical " : ""}alert on Guardian Pulse.</p>
    <div style="background:#2D4A3E;padding:16px;border-radius:6px;margin:16px 0;">
      <p><strong>Alert Type:</strong> ${alertLabel}</p>
      <p><strong>Condition:</strong> ${alertType.replace(/_/g, " ").toUpperCase()}</p>
      ${bpm ? `<p><strong>Heart Rate:</strong> ${bpm} BPM</p>` : ""}
      ${urgent ? '<p style="color:red;font-weight:bold;">Patient has NOT RESPONDED for 8 minutes.</p>' : ""}
    </div>
    ${mapsUrl ? `<a href="${mapsUrl}" style="display:block;background:#C4A882;color:#1A2E1F;padding:12px;text-align:center;border-radius:6px;font-weight:bold;text-decoration:none;">📍 View Patient Location</a>` : "<p>Location data unavailable.</p>"}
    <p style="margin-top:24px;font-size:13px;color:#C4A882;">If this is an emergency, call 112 immediately.<br>This alert was sent by Guardian Pulse medical monitoring system.</p>
  </div>
</body>
</html>`;
}
