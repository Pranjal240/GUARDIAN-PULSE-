/**
 * chatbot.js — Guardian Pulse
 * RAG-powered medical chatbot using Gemini 1.5 Flash
 * Retrieves context from Firestore rag_documents + user's health data
 *
 * Gemini API Key: <GEMINI_API_KEY>
 */

import { dbQuery, dbGet } from "./firebase.js";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM_PROMPT = `You are Guardian Pulse, a compassionate AI health assistant built to support patients with cardiac conditions, seizure disorders, Parkinson's disease, PTSD, and anxiety/panic disorders.

STRICT RULES:
1. ONLY discuss health topics related to the patient's conditions. Refuse all other topics politely.
2. NEVER diagnose. Always recommend consulting a doctor for medical decisions.
3. If the patient expresses an emergency or severe distress, immediately say "This sounds urgent — please tap 'Connect to Support' to reach a live agent, or call 112."
4. Be empathetic, concise, and use simple language. No medical jargon without explanation.
5. Use the patient health data and medical context provided to personalize responses.

Your tone: warm, professional, and reassuring — like a knowledgeable friend who happens to know medicine.`;

/**
 * Main chat handler.
 * @param {string} userId - Clerk user ID
 * @param {string} message - User's message
 * @param {Array} history - Last 10 messages [{role, content}]
 * @param {string|null} mediaUrl - R2 URL if user attached media
 * @param {Object} env - Cloudflare env bindings
 * @returns {string} AI response text
 */
export async function handleChat(
  userId,
  message,
  history = [],
  mediaUrl = null,
  env,
) {
  // 1. Get patient health summary from Firestore
  const healthContext = await buildHealthContext(userId, env);

  // 2. Retrieve RAG context (relevant medical documents)
  const ragContext = await retrieveRagContext(message, env);

  // 3. Build full prompt with context
  const contextualSystemPrompt = `${SYSTEM_PROMPT}

=== PATIENT HEALTH DATA ===
${healthContext}

${ragContext ? `=== RELEVANT MEDICAL INFORMATION ===\n${ragContext}` : ""}

${mediaUrl ? `=== USER SHARED MEDIA ===\nUser attached a file: ${mediaUrl}\nDescribe what you see and provide relevant health information.` : ""}`;

  // 4. Build Gemini conversation format
  const contents = [];

  // Add history
  for (const msg of history.slice(-10)) {
    // Last 10 messages
    contents.push({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.message }],
    });
  }

  // Add current message
  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  // 5. Call Gemini 1.5 Flash
  const geminiRes = await fetch(
    `${GEMINI_API_BASE}/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: contextualSystemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
          topP: 0.9,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH",
          },
          { category: "HARM_CATEGORY_MEDICAL", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
    },
  );

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    console.error("Gemini API error:", err);
    throw new Error("AI service temporarily unavailable. Please try again.");
  }

  const geminiData = await geminiRes.json();
  const response = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!response) throw new Error("No response from AI");

  // 6. Check if user needs live support
  const needsSupport = detectSupportTrigger(message, response);

  return { response, needsSupport };
}

/**
 * Detect if the user should be connected to live support.
 */
function detectSupportTrigger(userMessage, aiResponse) {
  const triggerPhrases = [
    "connect to support",
    "speak to someone",
    "talk to human",
    "live agent",
    "urgent",
    "emergency",
    "cant breathe",
    "can't breathe",
    "chest pain",
    "help me",
    "dying",
    "scared",
  ];
  const msg = userMessage.toLowerCase();
  return triggerPhrases.some((phrase) => msg.includes(phrase));
}

/**
 * Build patient health context from their recent Firestore data.
 */
async function buildHealthContext(userId, env) {
  try {
    const [userDoc, recentEcg, recentMotion, recentAlerts] = await Promise.all([
      dbGet(`users/${userId}`, env),
      dbQuery("ecg_readings", "userId", userId, 5, env),
      dbQuery("motion_data", "userId", userId, 5, env),
      dbQuery("alerts", "userId", userId, 3, env),
    ]);

    const latestBpm = recentEcg[0]?.bpm || "No data";
    const latestStress = recentMotion[0]?.stressLevel || "No data";
    const latestTremor = recentMotion[0]?.tremorDetected ? "Yes" : "No";
    const mode = userDoc?.mode || "normal";
    const recentAlertSummary =
      recentAlerts.length > 0
        ? recentAlerts.map((a) => `${a.alertType} (${a.status})`).join(", ")
        : "No recent alerts";

    return `Patient: ${userDoc?.name || "Unknown"}
Monitoring Mode: ${mode}
Latest BPM: ${latestBpm}
Stress Level: ${latestStress}/100
Tremor Detected: ${latestTremor}
Recent Alerts: ${recentAlertSummary}
Emergency Contact 1: ${userDoc?.emergencyContact1Name || "Not set"}`;
  } catch (e) {
    return "Patient health data temporarily unavailable.";
  }
}

/**
 * RAG: Retrieve relevant medical document chunks using cosine similarity.
 * Documents are stored in Firestore rag_documents with embedding arrays.
 */
async function retrieveRagContext(query, env) {
  try {
    // Get query embedding from Gemini
    const embedRes = await fetch(
      `${GEMINI_API_BASE}/models/text-embedding-004:embedContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { parts: [{ text: query }] } }),
      },
    );

    if (!embedRes.ok) return null; // Graceful fallback
    const embedData = await embedRes.json();
    const queryEmbedding = embedData.embedding?.values;
    if (!queryEmbedding) return null;

    // Fetch document chunks from Firestore
    const docs = await dbQuery("rag_documents", "active", true, 20, env);
    if (!docs.length) return null;

    // Find most relevant chunks by cosine similarity
    const scored = docs
      .filter((doc) => doc.embedding && Array.isArray(doc.embedding))
      .map((doc) => ({
        text: doc.chunkText,
        score: cosineSimilarity(queryEmbedding, doc.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // Top 3 chunks

    if (!scored.length || scored[0].score < 0.7) return null; // Low relevance threshold

    return scored.map((s) => s.text).join("\n\n---\n\n");
  } catch (e) {
    console.error("RAG retrieval error:", e);
    return null; // Non-fatal
  }
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate embeddings for a text chunk (used by process-rag-docs.js).
 */
export async function generateEmbedding(text, env) {
  const res = await fetch(
    `${GEMINI_API_BASE}/models/text-embedding-004:embedContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    },
  );
  if (!res.ok) throw new Error(`Embedding failed: ${await res.text()}`);
  const data = await res.json();
  return data.embedding?.values || [];
}
