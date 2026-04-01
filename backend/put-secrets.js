const { execSync } = require('child_process');

const secrets = {
  FIREBASE_CLIENT_EMAIL: "<FIREBASE_CLIENT_EMAIL>",
  FIREBASE_PRIVATE_KEY: "<FIREBASE_PRIVATE_KEY>",
  CLERK_JWKS_URL: "<CLERK_JWKS_URL>",
  RESEND_API_KEY: "<RESEND_API_KEY>",
  GEMINI_API_KEY: "<GEMINI_API_KEY>",
  TWILIO_ACCOUNT_SID: "<TWILIO_ACCOUNT_SID>",
  TWILIO_AUTH_TOKEN: "<TWILIO_AUTH_TOKEN>",
  TWILIO_PHONE: "<TWILIO_PHONE>",
  PI_SECRET: "<PI_SECRET>",
  R2_PUBLIC_URL: "<R2_PUBLIC_URL>"
};

// Set Cloudflare token locally so wrangler doesn't prompt for login
process.env.CLOUDFLARE_API_TOKEN = "<CLOUDFLARE_API_TOKEN>";

console.log("Pushing secrets to Cloudflare...");
for (const [key, value] of Object.entries(secrets)) {
  console.log(\`Setting \${key}...\`);
  try {
    execSync(\`npx.cmd wrangler secret put \${key}\`, { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
  } catch (err) {
    console.error(\`Failed to set \${key}:\`, err.message);
  }
}

console.log("Ready to deploy.");
