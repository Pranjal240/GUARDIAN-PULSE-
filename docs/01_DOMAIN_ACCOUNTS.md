# 🌍 FILE 01 — DOMAIN + ACCOUNTS SETUP
### Hinglish Guide | Guardian Pulse

---

## STEP 1: Domain Kharido — GoDaddy pe

**Kya karna hai:**
1. godaddy.com pe jao
2. Search karo: `guardianpulse.in`
3. Agar available hai → Add to Cart → ₹99 plan (1 year .in domain)
4. Account banao ya login karo → Pay karo
5. **Confirmation email aayegi — usse save karo**

> 💡 Agar `guardianpulse.in` nahi mila toh try karo:
> - `guardianpulse.app` — usually available hota hai
> - `gpulse.in`
> - `guardpulse.in`

---

## STEP 2: Clerk Account Banao (Authentication)

**Clerk kya hai?** — Ye tumhara login system hai. Google se login, email se login — sab Clerk handle karta hai. Tumhe kuch code nahi likhna.

1. **clerk.com** pe jao → "Start building for free"
2. GitHub se signup karo
3. **"Create Application"** click karo
   - Name: `Guardian Pulse`
   - Sign-in options select karo: ✅ Google, ✅ Email, ✅ Phone
4. Do dashboard dikhega:
   - **Publishable Key** → `pk_test_...` copy karo
   - **Secret Key** → `sk_test_...` copy karo
5. Left side mein → **"JWT Templates"** → Create → Firebase template banao
   - Ye Flutter app aur Firebase ko connect karega

> 📌 **Clerk ka sabse bada faida:** Google login ek line mein — koi complexity nahi, completely free 10,000 users tak

---

## STEP 3: Firebase Project Banao

**Firebase kya hai?** — Tumhara database, file storage, aur notification system — sab ek jagah, Google ka free product.

1. **firebase.google.com** pe jao → Sign in with Google
2. **"Add Project"** → Name: `GuardianPulse`
3. Google Analytics: Yes (free hai, useful hai)
4. Project ban jayega (~2 minutes)

### Firebase mein ye sab enable karo:

**A) Firestore Database:**
- Left sidebar → Build → Firestore Database
- "Create database" → **Production mode** → Region: `asia-south1` (India ke liye)
- Done

**B) Firebase Storage:**
- Left sidebar → Build → Storage
- "Get started" → Production mode

**C) Cloud Messaging (Push Notifications):**
- Left sidebar → Project Settings → Cloud Messaging
- Server Key copy karo → save karo

**D) Android App Add karo:**
- Project Settings → Add app → Android icon
- Package name: `com.guardianpulse.app`
- Download `google-services.json` → **apne Flutter project ke `android/app/` folder mein rakho**

**E) Web App Add karo (website ke liye):**
- Project Settings → Add app → Web icon (</>) 
- Name: `guardian-pulse-web`
- Firebase config object milega → save karo

---

## STEP 4: Cloudflare Account (Backend + DNS)

1. **cloudflare.com** pe jao → Sign up free
2. Left sidebar → **Workers & Pages** → "Create Worker"
3. Name: `guardian-pulse-api`
4. Deploy karo (default hello world) — baad mein code dalenge
5. Tumhara API address milega: `guardian-pulse-api.YOUR-NAME.workers.dev`

---

## STEP 5: Vercel Account (Website Hosting)

1. **vercel.com** pe jao → "Continue with GitHub"
2. Apna GitHub account connect karo
3. Abhi kuch deploy mat karo — website ready hone ke baad karenge

---

## STEP 6: Resend Account (Emergency Emails)

**Resend kya hai?** — Jab emergency alert aata hai, family ko email bhejne ke liye. 3000 emails/month FREE.

1. **resend.com** pe jao → Sign up free
2. Dashboard mein → **"Add API Key"** → Name: `guardian-pulse`
3. API key copy karo → save karo
4. **Domains** → "Add Domain" → `guardianpulse.in` add karo
5. DNS records milenge (baad mein GoDaddy pe add karenge)

---

## STEP 7: Sab Keys Ek File Mein Save Karo

Apne computer pe ek file banao: `.env` (kisi bhi text editor se)

```
# CLERK
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# FIREBASE  
FIREBASE_PROJECT_ID=guardianpulse-xxxxx
FIREBASE_SERVER_KEY=AAAAxxxxxxx
FIREBASE_API_KEY=AIzaxxxxxxx
FIREBASE_AUTH_DOMAIN=guardianpulse.firebaseapp.com
FIREBASE_STORAGE_BUCKET=guardianpulse.appspot.com

# HIVEMQ
HIVEMQ_HOST=your-cluster.hivemq.cloud
HIVEMQ_USERNAME=guardianpulse-pi
HIVEMQ_PASSWORD=your-password

# CLOUDFLARE (automatically set by wrangler)

# RESEND
RESEND_API_KEY=re_xxxxxxxxx

# TWILIO (emergency calls)
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE=+1234567890

# GEMINI
GEMINI_API_KEY=AIzaxxxxxxxxx
```

> ⚠️ **IMPORTANT:** Ye `.env` file kabhi bhi GitHub pe mat daalo. `.gitignore` mein add karo.

---

## STEP 8: Domain GoDaddy Se Vercel Se Link Karo

Ye baad mein karna hai (jab website ready ho), but process ye hai:

1. Vercel → Your Project → Settings → Domains → Add `www.guardianpulse.in`
2. Vercel 2 DNS records dega
3. GoDaddy → My Products → DNS → Manage → Add those records
4. 30 minutes wait karo
5. `www.guardianpulse.in` website show karega ✅

---

## STEP 9: Resend DNS Records GoDaddy Pe Add Karo

Resend ne jo DNS records diye the (Step 6), unhe GoDaddy DNS mein add karo.
Ye isliye karna hai taki emails `alerts@guardianpulse.in` se aayein — professional lagega.
