// Frontend API helpers — all calls go through Vite proxy → Express server
// MongoDB credentials never leave the server; this file is safe to bundle.

const BASE = '/api';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

// ── Event Config ──────────────────────────────────────────────────────────────

export async function fetchConfig(slug) {
  const data = await request('GET', `/config/${slug}`);
  return data.config;
}

export async function saveConfig(slug, updates, sessionEmail, sessionPassword) {
  const data = await request('PUT', `/config/${slug}`, {
    ...updates,
    sessionEmail,
    sessionPassword,
  });
  return data.config;
}

export async function resetConfig(slug, sessionEmail, sessionPassword) {
  const emailParam = encodeURIComponent(sessionEmail || '');
  const passParam = encodeURIComponent(sessionPassword || '');
  const data = await request('DELETE', `/config/${slug}/reset?email=${emailParam}&password=${passParam}`);
  return data.config;
}

export async function verifyConfigCredentials(slug, email, password) {
  const data = await request('POST', `/config/${slug}/verify`, { email, password });
  return data;
}

export async function globalLogin(email, password) {
  const data = await request('POST', '/config/login', { email, password });
  return data;
}

export async function createEvent(slug, eventName, sessionEmail, sessionPassword) {
  const data = await request('POST', '/config/create', {
    slug,
    eventName,
    sessionEmail,
    sessionPassword,
  });
  return data.config;
}

// ── Poster Analytics ──────────────────────────────────────────────────────────

/**
 * Log that a user generated (and optionally downloaded) a poster.
 * No personal data or photos are sent — just the event slug and flags.
 */
export async function logPosterGenerated(slug, { bgRemoved = false, downloaded = false } = {}) {
  try {
    const data = await request('POST', '/poster/generated', { slug, bgRemoved, downloaded });
    return data.id; // generation ID for later marking as downloaded
  } catch (err) {
    // Analytics failures are non-critical — swallow silently
    console.warn('Analytics log failed (non-critical):', err.message);
    return null;
  }
}

export async function markPosterDownloaded(generationId) {
  if (!generationId) return;
  try {
    await request('PATCH', `/poster/downloaded/${generationId}`);
  } catch (err) {
    console.warn('Mark downloaded failed (non-critical):', err.message);
  }
}

export async function fetchStats(slug) {
  const data = await request('GET', `/poster/stats/${slug}`);
  return data.stats;
}

// ── Template Upload ────────────────────────────────────────────────────────────

/**
 * Upload an organizer's poster template image to Cloudinary via the server.
 * Uses multipart/form-data so the file goes server → Cloudinary (never base64).
 * @param {File} file     - the image File object
 * @param {string} slug   - event slug
 * @param {function} onProgress - optional progress callback (0-100)
 */
export async function uploadTemplate(file, slug, onProgress, sessionEmail, sessionPassword) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('template', file);
    formData.append('slug', slug);
    formData.append('sessionEmail', sessionEmail || '');
    formData.append('sessionPassword', sessionPassword || '');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/upload/template`, true);
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.ok) resolve(data);
          else reject(new Error(data.error || 'Upload failed'));
        } catch {
          resolve({ ok: true, url: xhr.responseText }); // fallback
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          reject(new Error(data.error || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

// ── ML Offloading ────────────────────────────────────────────────────────────

export async function removeBgServer(file) {
  const formData = new FormData();
  formData.append('photo', file);

  const primaryUrl = import.meta.env.VITE_AZURE_BG_REMOVER_URL || 'http://localhost:8080/remove-bg';
  const fallbackUrl = `${BASE}/upload/remove-bg`;

  try {
    console.log(`[INFO] Attempting background removal via primary service: ${primaryUrl}`);
    const res = await fetch(primaryUrl, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Primary bg remover returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error || 'Primary bg remover failed');
    }
    return data.dataUrl;
  } catch (primaryErr) {
    console.warn(`[WARN] Primary background remover (${primaryUrl}) failed, falling back to main backend:`, primaryErr.message || primaryErr);
    
    const res = await fetch(fallbackUrl, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Server background removal fallback failed');
    }
    return data.dataUrl;
  }
}


export async function removeTemplate(slug, sessionEmail, sessionPassword) {
  const emailParam = encodeURIComponent(sessionEmail || '');
  const passParam = encodeURIComponent(sessionPassword || '');
  const res = await fetch(`/api/upload/template/${slug}?email=${emailParam}&password=${passParam}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Failed to remove template');
  return data;
}

// ── Background Image Upload ───────────────────────────────────────────────────

/**
 * Upload an organizer's custom page background image to Cloudinary via the server.
 * @param {File} file     - the image File object
 * @param {string} slug   - event slug
 * @param {function} onProgress - optional progress callback (0-100)
 */
export async function uploadBackground(file, slug, onProgress, sessionEmail, sessionPassword) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('background', file);
    formData.append('slug', slug);
    formData.append('sessionEmail', sessionEmail || '');
    formData.append('sessionPassword', sessionPassword || '');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload/background');

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (!data.ok) return reject(new Error(data.error || 'Upload failed'));
        resolve(data);
      } catch {
        reject(new Error('Invalid server response'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

export async function removeBackground(slug, sessionEmail, sessionPassword) {
  const emailParam = encodeURIComponent(sessionEmail || '');
  const passParam = encodeURIComponent(sessionPassword || '');
  const res = await fetch(`/api/upload/background/${slug}?email=${emailParam}&password=${passParam}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Failed to remove background image');
  return data;
}

// ── Event Information Banner Upload ────────────────────────────────────────────

/**
 * Upload an organizer's custom event banner image to Cloudinary via the server.
 * @param {File} file     - the image File object
 * @param {string} slug   - event slug
 * @param {function} onProgress - optional progress callback (0-100)
 */
export async function uploadBanner(file, slug, onProgress, sessionEmail, sessionPassword) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('banner', file);
    formData.append('slug', slug);
    formData.append('sessionEmail', sessionEmail || '');
    formData.append('sessionPassword', sessionPassword || '');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload/banner');

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (!data.ok) return reject(new Error(data.error || 'Upload failed'));
        resolve(data);
      } catch {
        reject(new Error('Invalid server response'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

export async function removeBanner(slug, sessionEmail, sessionPassword) {
  const emailParam = encodeURIComponent(sessionEmail || '');
  const passParam = encodeURIComponent(sessionPassword || '');
  const res = await fetch(`/api/upload/banner/${slug}?email=${emailParam}&password=${passParam}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Failed to remove banner');
  return data;
}

/**
 * Save the generated poster canvas (as base64 PNG) to Cloudinary.
 * @param {HTMLCanvasElement} canvas
 * @param {string} slug
 * @param {string|null} generationId
 */
export async function savePosterToCloud(canvas, slug, generationId = null) {
  const dataUrl = canvas.toDataURL('image/png');
  const data = await request('POST', '/upload/poster', { slug, dataUrl, generationId });
  return data; // { url, thumbnailUrl, publicId, shareLink }
}

// ── Health ─────────────────────────────────────────────────────────────────────
export async function checkHealth() {
  try {
    const data = await request('GET', '/health');
    return data.ok;
  } catch {
    return false;
  }
}
