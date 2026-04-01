/**
 * index.js — Guardian Pulse Cloudflare Worker — Main Router
 * All API endpoints + MQTT webhook handler + scheduled escalation
 *
 * Base URL: https://api.guardianpulse.in
 */

import { verifyClerkJWT, verifyPiSecret, extractBearerToken } from "./auth.js";
import { dbPush, dbUpdate, dbQuery, dbGet } from "./firebase.js";
import { detectAnomalies } from "./ecg-logic.js";
import { triggerAlert, resolveAlert, escalateAlerts } from "./alert-engine.js";
import { handleChat } from "./chatbot.js";
import { uploadToR2 } from "./r2-media.js";

// ─── CORS Headers ──────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Pi-Secret",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function error(message, status = 400) {
  return json({ success: false, error: message }, status);
}

// ─── Main Fetch Handler ────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ── GET / ── (Health check)
      if (path === "/" && request.method === "GET") {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Guardian Pulse API is Live 🫀",
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // ── POST /sensor-data ── (Raspberry Pi → HiveMQ webhook → here)
      if (path === "/sensor-data" && request.method === "POST") {
        return await handleSensorData(request, env);
      }

      // ── POST /alert-user ── (Manual alert creation)
      if (path === "/alert-user" && request.method === "POST") {
        return await handleAlertUser(request, env);
      }

      // ── POST /resolve-alert ── (User taps "I'M OKAY")
      if (path === "/resolve-alert" && request.method === "POST") {
        return await handleResolveAlert(request, env);
      }

      // ── POST /chat ── (AI chatbot)
      if (path === "/chat" && request.method === "POST") {
        return await handleChatRequest(request, env);
      }

      // ── POST /support-request ── (User wants live support)
      if (path === "/support-request" && request.method === "POST") {
        return await handleSupportRequest(request, env);
      }

      // ── POST /upload-media ── (R2 file upload for chat)
      if (path === "/upload-media" && request.method === "POST") {
        return await handleMediaUpload(request, env);
      }

      // ── GET /patient-data ── (Admin: get patient sensor history)
      if (path === "/patient-data" && request.method === "GET") {
        return await handlePatientData(request, url, env);
      }

      // ── POST /update-alert-location ── (Location tracking during alert)
      if (path === "/update-alert-location" && request.method === "POST") {
        return await handleUpdateLocation(request, env);
      }

      // ── POST /save-fcm-token ── (Save app FCM token after login)
      if (path === "/save-fcm-token" && request.method === "POST") {
        return await handleSaveFcmToken(request, env);
      }

      return error("Route not found", 404);
    } catch (err) {
      console.error(`[${path}] Error:`, err.message);
      return error(err.message, err.message.includes("Auth") ? 401 : 500);
    }
  },

  // ── Cron: runs every minute — handles alert escalation ──────────────────────
  async scheduled(event, env, ctx) {
    console.log("[CRON] Alert escalation check running...");
    try {
      await escalateAlerts(env);
      console.log("[CRON] Alert escalation complete");
    } catch (err) {
      console.error("[CRON] Escalation error:", err.message);
    }
  },
};

// ─── Route Handlers ────────────────────────────────────────────────────────────

/**
 * POST /sensor-data
 * Called by HiveMQ Webhook when Pi publishes MQTT data.
 * Body: { topic: string, payload: object }
 */
async function handleSensorData(request, env) {
  verifyPiSecret(request, env); // throws if invalid

  const body = await request.json();
  const { topic, payload } = body;

  if (!topic || !payload) return error("Missing topic or payload");

  const userId = payload.userId;
  if (!userId) return error("Missing userId in payload");

  // Get user's monitoring mode for threshold calibration
  const userDoc = await dbGet(`users/${userId}`, env).catch(() => null);
  const mode = userDoc?.mode || "normal";
  const baselineBpm = userDoc?.baselineBpm || 75;

  if (topic === "guardianpulse/ecg") {
    // 1. Parse + validate ECG data
    const ecgData = {
      userId,
      bpm: Number(payload.bpm) || 0,
      voltage: Number(payload.rawValue) || 0,
      rrInterval: Number(payload.rrInterval) || 0,
      isAnomaly: false,
      anomalyType: null,
      timestamp: new Date().toISOString(),
    };

    // 2. Fetch last 30 ECG readings for anomaly context
    const recentEcg = await dbQuery("ecg_readings", "userId", userId, 30, env);
    const recentMotion = await dbQuery(
      "motion_data",
      "userId",
      userId,
      50,
      env,
    );

    // 3. Run anomaly detection
    const allReadings = [...recentEcg, ecgData];
    const analysis = detectAnomalies(
      allReadings,
      recentMotion,
      mode,
      baselineBpm,
    );

    // Update ECG doc with anomaly info
    ecgData.isAnomaly = analysis.isAnomaly;
    ecgData.anomalyType = analysis.primaryAlertType;
    ecgData.stressLevel = analysis.stress.level;

    // 4. Save to Firestore
    await dbPush("ecg_readings", ecgData, env);

    // 5. Trigger alert if critical anomaly found
    if (analysis.isAnomaly && analysis.severity !== "low") {
      // Throttle: don't spam alerts (check if alert already pending in last 5 minutes)
      const recentAlerts = await dbQuery("alerts", "userId", userId, 1, env);
      const lastAlert = recentAlerts[0];
      const throttleMs = 5 * 60 * 1000;
      const shouldAlert =
        !lastAlert ||
        Date.now() - new Date(lastAlert.createdAt).getTime() > throttleMs;

      if (shouldAlert) {
        await triggerAlert(
          userId,
          analysis.primaryAlertType,
          analysis.severity,
          analysis,
          env,
        );
      }
    }

    return json({ success: true, analysis });
  } else if (topic === "guardianpulse/motion") {
    // Motion/accelerometer data from MPU6050
    const motionData = {
      userId,
      accelX: Number(payload.accelX) || 0,
      accelY: Number(payload.accelY) || 0,
      accelZ: Number(payload.accelZ) || 0,
      gyroX: Number(payload.gyroX) || 0,
      gyroY: Number(payload.gyroY) || 0,
      gyroZ: Number(payload.gyroZ) || 0,
      tremorDetected: Boolean(payload.tremorDetected),
      tremorFrequency: Number(payload.tremorFrequency) || 0,
      stressLevel: Number(payload.stressLevel) || 0,
      timestamp: new Date().toISOString(),
    };

    await dbPush("motion_data", motionData, env);
    return json({ success: true });
  } else {
    return error(`Unknown topic: ${topic}`);
  }
}

/**
 * POST /alert-user
 * Auth: Clerk JWT
 * Body: { userId, alertType, severity }
 */
async function handleAlertUser(request, env) {
  const token = extractBearerToken(request);
  const { userId: clerkId } = await verifyClerkJWT(token, env);

  const { userId, alertType, severity } = await request.json();
  if (!userId || !alertType) return error("Missing userId or alertType");

  const alertId = await triggerAlert(
    userId,
    alertType,
    severity || "medium",
    {},
    env,
  );
  return json({ success: true, alertId });
}

/**
 * POST /resolve-alert
 * Auth: Clerk JWT
 * Body: { alertId }
 */
async function handleResolveAlert(request, env) {
  const token = extractBearerToken(request);
  const { userId } = await verifyClerkJWT(token, env);
  const { alertId } = await request.json();
  if (!alertId) return error("Missing alertId");

  await resolveAlert(alertId, userId, env);
  return json({ success: true });
}

/**
 * POST /chat
 * Auth: Clerk JWT
 * Body: { userId, message, history?, mediaUrl? }
 */
async function handleChatRequest(request, env) {
  const token = extractBearerToken(request);
  const { userId } = await verifyClerkJWT(token, env);

  const { message, history = [], mediaUrl = null } = await request.json();
  if (!message) return error("Missing message");

  const { response, needsSupport } = await handleChat(
    userId,
    message,
    history,
    mediaUrl,
    env,
  );

  // Save both user message + AI response to Firestore
  await dbPush(
    "chat_messages",
    {
      userId,
      message,
      sender: "user",
      mediaUrl,
      timestamp: new Date().toISOString(),
    },
    env,
  );
  await dbPush(
    "chat_messages",
    {
      userId,
      message: response,
      sender: "ai",
      needsSupport,
      timestamp: new Date().toISOString(),
    },
    env,
  );

  return json({ success: true, response, needsSupport });
}

/**
 * POST /support-request
 * Auth: Clerk JWT
 * Marks the latest chat message as needing live support.
 */
async function handleSupportRequest(request, env) {
  const token = extractBearerToken(request);
  const { userId } = await verifyClerkJWT(token, env);

  // Write a support request message
  await dbPush(
    "chat_messages",
    {
      userId,
      message: "User has requested live support.",
      sender: "system",
      needsSupport: true,
      timestamp: new Date().toISOString(),
    },
    env,
  );

  return json({
    success: true,
    message: "Support request sent. An agent will join shortly.",
  });
}

/**
 * POST /upload-media
 * Auth: Clerk JWT
 * Body: FormData with 'file' field and optional 'type' field
 * Returns: { publicUrl, fileName }
 */
async function handleMediaUpload(request, env) {
  const token = extractBearerToken(request);
  const { userId } = await verifyClerkJWT(token, env);

  const formData = await request.formData();
  const file = formData.get("file");
  const type = formData.get("type") || "chat";

  if (!file) return error("No file provided");

  const result = await uploadToR2(file, userId, type, env);
  return json({ success: true, ...result });
}

/**
 * GET /patient-data
 * Auth: Clerk JWT (admin role preferred)
 * Query: ?userId=xxx&type=ecg|motion|all&range=24h|7d|30d
 */
async function handlePatientData(request, url, env) {
  const token = extractBearerToken(request);
  await verifyClerkJWT(token, env); // Auth check

  const targetUserId = url.searchParams.get("userId");
  const type = url.searchParams.get("type") || "all";
  const limit = parseInt(url.searchParams.get("limit") || "50");

  if (!targetUserId) return error("Missing userId query param");

  const result = {};

  if (type === "ecg" || type === "all") {
    result.ecg = await dbQuery(
      "ecg_readings",
      "userId",
      targetUserId,
      limit,
      env,
    );
  }
  if (type === "motion" || type === "all") {
    result.motion = await dbQuery(
      "motion_data",
      "userId",
      targetUserId,
      limit,
      env,
    );
  }
  if (type === "all") {
    result.alerts = await dbQuery("alerts", "userId", targetUserId, 20, env);
  }

  return json({ success: true, data: result });
}

/**
 * POST /update-alert-location
 * Auth: Clerk JWT
 * Body: { alertId, lat, lng }
 */
async function handleUpdateLocation(request, env) {
  const token = extractBearerToken(request);
  await verifyClerkJWT(token, env);

  const { alertId, lat, lng } = await request.json();
  if (!alertId || lat == null || lng == null)
    return error("Missing alertId, lat, or lng");

  await dbUpdate(
    `alerts/${alertId}`,
    {
      lat: Number(lat),
      lng: Number(lng),
      locationUpdatedAt: new Date().toISOString(),
    },
    env,
  );

  return json({ success: true });
}

/**
 * POST /save-fcm-token
 * Auth: Clerk JWT
 * Body: { fcmToken }
 */
async function handleSaveFcmToken(request, env) {
  const token = extractBearerToken(request);
  const { userId } = await verifyClerkJWT(token, env);

  const { fcmToken } = await request.json();
  if (!fcmToken) return error("Missing fcmToken");

  await dbUpdate(`users/${userId}`, { fcmToken }, env);
  return json({ success: true });
}
