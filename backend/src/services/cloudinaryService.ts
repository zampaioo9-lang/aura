import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

let configured = false;

function isPlaceholder(val: string): boolean {
  return !val || val.startsWith('your-') || val === 'placeholder';
}

function ensureConfigured() {
  if (configured) return;
  if (isPlaceholder(env.CLOUDINARY_CLOUD_NAME) || isPlaceholder(env.CLOUDINARY_API_KEY) || isPlaceholder(env.CLOUDINARY_API_SECRET)) {
    return;
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  configured = true;
}

function isConfigured(): boolean {
  ensureConfigured();
  return configured;
}

export async function uploadImage(
  fileBuffer: Buffer,
  folder: string = 'aura/profiles'
): Promise<{ url: string; publicId: string }> {
  if (!isConfigured()) {
    throw new Error('Cloudinary not configured');
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
        ],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    ).end(fileBuffer);
  });
}

export async function uploadVideo(
  fileBuffer: Buffer,
  folder: string = 'aura/videos'
): Promise<{ url: string; publicId: string; thumbnailUrl: string }> {
  if (!isConfigured()) {
    throw new Error('Cloudinary not configured');
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov'],
        eager: [{ format: 'jpg', transformation: [{ width: 640, crop: 'scale' }] }],
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Upload failed'));
        const thumbnailUrl = result.eager?.[0]?.secure_url ||
          result.secure_url.replace(/\.\w+$/, '.jpg');
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          thumbnailUrl,
        });
      }
    ).end(fileBuffer);
  });
}

export async function deleteFile(publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<boolean> {
  if (!isConfigured()) {
    console.log('[Cloudinary] Not configured. Would delete:', publicId);
    return false;
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return true;
  } catch (err) {
    console.error('[Cloudinary] Delete failed:', err);
    return false;
  }
}

export { isConfigured as isCloudinaryConfigured };
