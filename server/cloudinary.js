import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

// Configure once at module load
cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
  secure:      true,
});

/**
 * Upload a Buffer directly to Cloudinary (no temp files).
 * @param {Buffer} buffer   - raw image bytes
 * @param {object} options  - Cloudinary upload options
 * @returns {Promise<object>} Cloudinary upload result
 */
export function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:           'gemma 4',
        allowed_formats:  ['jpg', 'jpeg', 'png', 'webp'],
        transformation:   [{ quality: 'auto', fetch_format: 'auto' }],
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Upload a base64-encoded data URL directly to Cloudinary.
 * @param {string} dataUrl  - e.g. "data:image/png;base64,iVBOR..."
 * @param {object} options  - Cloudinary upload options
 */
export function uploadDataUrl(dataUrl, options = {}) {
  return cloudinary.uploader.upload(dataUrl, {
    folder:          'gemma 4',
    transformation:  [{ quality: 'auto', fetch_format: 'auto' }],
    ...options,
  });
}

/**
 * Delete an asset from Cloudinary by its public_id.
 */
export function deleteAsset(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

export { cloudinary };
