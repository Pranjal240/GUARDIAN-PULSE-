# 🤖 FILE 07 — AI CHATBOT + CLERK AUTH + RESEND EMAILS
### Guardian Pulse | Hinglish Guide

---

## PART A: CLERK INTEGRATION — DONO JAGAH

### Flutter App mein Clerk:

**VS Code Copilot prompt:**
```
Create ClerkService class for Flutter/Dart:

1. Initialize Clerk with publishableKey in main.dart
2. signInWithGoogle() method using Clerk OAuth
3. signInWithEmail(email) → OTP flow
4. verifyOTP(code) method
5. getAuthToken() → returns JWT string for API calls
6. getCurrentUserId() → returns Clerk user ID string
7. signOut() method
8. Stream<bool> isAuthenticated → watches session state

In every Firestore read, use userId = Clerk.shared.session?.userId
In every API call header: 'Authorization': 'Bearer ${await getAuthToken()}'
```

### Next.js Website mein Clerk:
**Antigravity prompt:**
```
Add Clerk authentication to Next.js Guardian Pulse admin website:

1. Wrap app/layout.tsx with ClerkProvider
2. middleware.ts: protect all /dashboard/* routes
3. Login page: simple email/password (NOT Google — admins only)
4. After login: check if user has admin role in Firestore
   If not admin → redirect to /unauthorized page
5. useAuth() hook usage in all pages
6. In all Cloudflare API calls from website:
   const { getToken } = useAuth();
   const token = await getToken();
   fetch('/api/...', { headers: { Authorization: `Bearer ${token}` } })
```

---

## PART B: RESEND EMAILS — Emergency Alerts

**Resend kya karta hai:** Emergency contact ko email bhejta hai jab patient respond nahi karta.

### Cloudflare Worker mein — VS Code Copilot prompt:
```
Create sendEmergencyEmail(options, env) function for Cloudflare Worker:

Using Resend API (https://api.resend.com/emails):
POST with:
  from: "alerts@guardianpulse.in"
  to: options.emergencyEmail
  subject: "🚨 URGENT: [Patient Name] needs help"
  html: Beautiful HTML email with:
    - Red header with Guardian Pulse logo text
    - Patient name, photo (if available)
    - Alert type with explanation in simple words
    - Detected time
    - Current BPM and stress level
    - Google Maps link showing patient location
    - "Patient has not responded for X minutes" message
    - Large button: "Call [Patient Phone]"
    - Second button: "View Live Status" → links to admin website
    - Footer: "If you cannot reach them, call 108 (Ambulance)"

Also create sendAlertResolvedEmail() for when alert is resolved.
Use env.RESEND_API_KEY for authentication.
```

### Email subjects logic:
```
T+2min: "⚠️ [Name] has not responded to health alert — Please check on them"
T+8min: "🚨 URGENT: Ambulance being dispatched for [Name]"
Resolved: "✅ [Name] is safe — Alert resolved"
```

---

## PART C: RAG CHATBOT — Medical Knowledge

### Step 1: Research Papers Download karo

Google pe search karo aur PDF download karo:

1. **MIT/PhysioNet:** "physionet.org MIT-BIH arrhythmia database" → Download paper
2. **NIMH Panic:** site:nimh.nih.gov "panic disorder" → Download PDF
3. **WHO Parkinson's:** "who.int parkinson's disease fact sheet" → Download
4. **AHA ECG:** "heart.org ECG interpretation guidelines PDF" → Download
5. **PTSD + Heart:** Google Scholar → "PTSD heart rate variability review PDF" → Download

Save in `backend/rag-documents/` folder

### Step 2: Process karo — VS Code Copilot prompt:
```
Create Node.js script process-rag-docs.js:

1. Read all PDFs from ./rag-documents/ using pdf-parse library
2. Split each PDF text into chunks: 400 words each, 50 word overlap
3. For each chunk, create embedding via Gemini API:
   POST https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent
   Body: { "content": { "parts": [{"text": chunkText}] } }
   Auth: ?key=GEMINI_API_KEY
4. Store in Firebase Firestore rag_documents collection:
   { sourceFile, chunkText, embedding: array of 768 numbers, createdAt }
5. Process 3 chunks per second (rate limit respect)
6. Show progress: "Processing chunk 45/230..."

Run: GEMINI_API_KEY=your-key node process-rag-docs.js
```

### Step 3: Chatbot in Cloudflare — VS Code Copilot prompt:
```
Create src/chatbot.js for Cloudflare Worker:

async function handleChat(userId, message, history, mediaUrl, env):

1. Get user's health summary from Firestore:
   - Last 24h: avg BPM, max BPM, stress level, any anomalies
   
2. Create embedding of user's message via Gemini Embedding API

3. Search rag_documents in Firestore:
   - Get all documents (max 500 — Firestore limit)
   - Calculate cosine similarity with message embedding
   - Return top 3 most similar chunks

4. Build Gemini request:
   Model: gemini-1.5-flash
   System prompt: "You are Guardian Pulse health assistant. 
   Answer ONLY about: heart health, ECG, seizures, Parkinson's, 
   panic attacks, PTSD, tremors, and stress management.
   Never give definitive diagnoses. Always recommend consulting a doctor.
   User's current data: [health_summary]. 
   Medical context: [top 3 RAG chunks].
   If asked about conditions unrelated to these topics, politely redirect."
   
   If mediaUrl provided: include as image in message
   
5. Stream response from Gemini

6. Return: { response: string, sources: array of source file names }

Detect if user asks "speak to support" or "human agent":
  → Set needsSupport: true in Firestore
  → Return: { response: "Connecting you to support...", needsSupport: true }
```

---

## PART D: FIREBASE STORAGE — Chat Media

**VS Code Copilot prompt for Flutter:**
```
Create MediaUploadService for Flutter:

uploadChatMedia(File file, String userId) async:
1. Get file extension (jpg, mp4, etc.)
2. Generate unique filename: userId_timestamp.ext
3. Upload to Firebase Storage: chat-media/userId/filename
4. Show upload progress (0.0 to 1.0)
5. Get download URL after upload
6. Return download URL string

Used in chat screen: before sending message, upload media, then send URL with message.
```
