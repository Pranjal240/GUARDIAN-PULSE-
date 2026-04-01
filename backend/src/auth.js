/**
 * auth.js — Guardian Pulse
 * Verifies Clerk JWTs and Raspberry Pi secret header
 */

/**
 * Verifies a Clerk JWT using the JWKS endpoint.
 * Returns { userId, valid: true } or throws 401 error.
 */
export async function verifyClerkJWT(token, env) {
  if (!token) throw new Error('No authorization token provided');

  try {
    // Fetch Clerk's public JWKS
    const jwksUrl = env.CLERK_JWKS_URL;
    const jwksRes = await fetch(jwksUrl);
    const jwks = await jwksRes.json();

    // Decode JWT header to get kid
    const [headerB64] = token.split('.');
    const header = JSON.parse(atob(headerB64));
    const key = jwks.keys.find(k => k.kid === header.kid);
    if (!key) throw new Error('JWT key not found in JWKS');

    // Import the public key
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Verify the JWT signature
    const [, payloadB64, signatureB64] = token.split('.');
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signature,
      data
    );

    if (!valid) throw new Error('Invalid JWT signature');

    // Decode payload
    const payload = JSON.parse(atob(payloadB64));

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error('JWT has expired');
    }

    // Clerk stores userId in 'sub'
    return { userId: payload.sub, valid: true };
  } catch (err) {
    throw new Error(`Auth failed: ${err.message}`);
  }
}

/**
 * Verifies the X-Pi-Secret header from Raspberry Pi requests.
 */
export function verifyPiSecret(request, env) {
  const piSecret = request.headers.get('X-Pi-Secret');
  if (!piSecret || piSecret !== env.PI_SECRET) {
    throw new Error('Invalid Pi secret');
  }
  return true;
}

/**
 * Extracts Bearer token from Authorization header.
 */
export function extractBearerToken(request) {
  const authHeader = request.headers.get('Authorization') || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}
