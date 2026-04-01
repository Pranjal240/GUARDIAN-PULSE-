# 🔒 FILE 08 — SECURITY GUIDE
### Medical data = bahut sensitive | Guardian Pulse | Hinglish

---

## RULE 1: API KEYS KABHI CODE MEIN MAT DAALO

❌ GALAT:
```javascript
const key = "AIzaSy-real-key-here";
```

✅ SAHI:
```javascript
const key = env.GEMINI_API_KEY; // Cloudflare Worker
// Flutter mein: .env file use karo, .gitignore mein add karo
```

---

## RULE 2: .gitignore FILE ZAROOR BANAO

Project root mein `.gitignore` file banao:
```
.env
*.env
google-services.json
GoogleService-Info.plist
.dart_tool/
build/
node_modules/
.wrangler/
```

**GitHub pe koi bhi key push ho gayi toh:**
1. Turant us key ko delete karo aur naya banao
2. GitHub automatically detect karta hai exposed keys — email aata hai

---

## RULE 3: FIREBASE SECURITY RULES (File 02 mein already diya)

Ye ensure karta hai:
- Patient A → sirf apna data dekh sakta hai
- Patient B → sirf apna data
- Admin website (service account) → sab kuch dekh sakta hai

---

## RULE 4: CLERK JWT VERIFICATION — HAR API CALL PE

Cloudflare Worker mein:
```javascript
async function verifyClerkJWT(token, env) {
  // Clerk JWKS endpoint se verify karo
  const response = await fetch(env.CLERK_JWKS_URL);
  const jwks = await response.json();
  // JWT verify karo
  // Agar invalid → 401 return karo
}
```

Ye ensure karta hai sirf **tumhara app** tumhare API ko call kar sakta hai.

---

## RULE 5: PI SECRET HEADER

Raspberry Pi se aane wala data verify karo:
```javascript
// Cloudflare Worker mein
const piSecret = request.headers.get('X-Pi-Secret');
if (piSecret !== env.PI_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```

Pi script mein:
```python
headers = {"X-Pi-Secret": os.environ['PI_SECRET']}
```

---

## RULE 6: HTTPS EVERYWHERE

- Cloudflare → automatic HTTPS ✅
- Vercel → automatic HTTPS ✅
- HiveMQ → SSL port 8883 ✅
- Flutter → sirf HTTPS endpoints call karo

---

## RULE 7: FLUTTER SECURE STORAGE

Emergency contacts locally store karne ke liye:
```dart
// flutter_secure_storage use karo, NOT shared_preferences
final storage = FlutterSecureStorage();
await storage.write(key: 'emergency_contact', value: phone);
```

---

## RULE 8: RATE LIMITING (Abuse rokna)

`wrangler.toml` mein add karo:
```toml
[[unsafe.bindings]]
name = "RATE_LIMITER"  
type = "ratelimit"
namespace_id = "1"
simple = { limit = 60, period = 60 }
```
Max 60 requests/minute per IP — DDoS se protection.

---

## RULE 9: PRIVACY POLICY (Medical app ke liye zaruri)

1. **termly.io** pe jao → Generate free privacy policy
2. Download HTML → website pe `/privacy` page banao
3. App mein Settings → Privacy Policy link

Medical app hone ke wajah se ye important hai:
- Clearly batao ki kya data collect hota hai (ECG, location, health data)
- Kab emergency contacts ko inform kiya jata hai
- Data kaise delete kar sakte hain

---

## RULE 10: FIREBASE BACKUP

Firebase Console → Firestore → Backups:
- Free tier: 7-day automatic backups
- Ye automatically hota hai, kuch karna nahi

Extra safety: Har Sunday manually export karo:
Firebase Console → Import/Export → Export → Google Cloud Storage
