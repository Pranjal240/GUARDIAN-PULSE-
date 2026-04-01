/**
 * r2-media.js — Guardian Pulse
 * Handles file uploads to Cloudflare R2 (replaces Firebase Storage)
 * 
 * R2 free tier: 10 GB storage + 1M uploads/month + 10M reads/month + ZERO egress fees
 */

/**
 * Upload a file from a FormData field to Cloudflare R2.
 * @param {File} file - The file object from FormData
 * @param {string} userId - The Clerk user ID (used for folder organization)
 * @param {string} type - 'chat' | 'profile' | 'report'
 * @param {Object} env - Cloudflare environment bindings
 * @returns {{ publicUrl: string, fileName: string }}
 */
export async function uploadToR2(file, userId, type = 'chat', env) {
  // Validate file type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'application/pdf'
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed`);
  }

  // 50MB max file size
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size && file.size > MAX_SIZE) {
    throw new Error('File too large (max 50 MB)');
  }

  // Build a unique filename: type/userId/timestamp-originalname
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const fileName = `${type}/${userId}/${timestamp}-${safeName}`;

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer();
  await env.MEDIA_BUCKET.put(fileName, arrayBuffer, {
    httpMetadata: { contentType: file.type },
    customMetadata: { userId, uploadType: type },
  });

  // Build public URL from the R2 public bucket URL
  // R2_PUBLIC_URL env var = https://pub-xxxxx.r2.dev (set in Cloudflare Dashboard)
  const publicUrl = `${env.R2_PUBLIC_URL}/${fileName}`;

  return { publicUrl, fileName };
}

/**
 * Delete a file from R2 by its fileName key.
 */
export async function deleteFromR2(fileName, env) {
  await env.MEDIA_BUCKET.delete(fileName);
  return true;
}

/**
 * Get a list of files for a specific user from R2 (admin use).
 */
export async function listUserFiles(userId, type = 'chat', env) {
  const prefix = `${type}/${userId}/`;
  const list = await env.MEDIA_BUCKET.list({ prefix });
  return list.objects.map(obj => ({
    fileName: obj.key,
    size: obj.size,
    uploaded: obj.uploaded,
    publicUrl: `${env.R2_PUBLIC_URL}/${obj.key}`,
  }));
}
