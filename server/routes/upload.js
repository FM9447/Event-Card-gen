import { Router } from 'express';
import multer from 'multer';
import { removeBackground } from '@imgly/background-removal-node';
import { uploadBuffer, uploadDataUrl, deleteAsset } from '../cloudinary.js';
import PosterGeneration from '../models/PosterGeneration.js';
import EventConfig from '../models/EventConfig.js';
import { verifyAuth } from '../auth.js';

const router = Router();

// ── Multer: store files in memory (no disk I/O, direct to Cloudinary) ──────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max (Cloudinary free limit)
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

// ── POST /api/upload/remove-bg ──────────────────────────────────────────────
// Receive a photo, remove background on server, and return as base64 PNG.
router.post('/remove-bg', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }

    console.log('[POST /api/upload/remove-bg] Processing image of size:', req.file.size);
    // Convert multer buffer to Blob for imgly
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    
    // Process via local ML model
    const resultBlob = await removeBackground(blob);
    
    // Convert back to base64
    const arrayBuffer = await resultBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:image/png;base64,${buffer.toString('base64')}`;

    res.json({ ok: true, dataUrl: base64 });
  } catch (err) {
    console.error('[POST /api/upload/remove-bg]', err);
    res.status(500).json({ ok: false, error: 'Background removal failed' });
  }
});

// ── POST /api/upload/photo ─────────────────────────────────────────────────
// Upload a participant's raw photo to Cloudinary.
// Accepts multipart/form-data with field "photo".
router.post('/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }

    const result = await uploadBuffer(req.file.buffer, {
      folder:    'gemma 4/originals',
      public_id: `photo_${Date.now()}`,
      tags:      ['participant', req.body.slug || 'gemma4-kozhikode'],
    });

    res.json({
      ok:        true,
      url:       result.secure_url,
      publicId:  result.public_id,
      width:     result.width,
      height:    result.height,
      format:    result.format,
      bytes:     result.bytes,
    });
  } catch (err) {
    console.error('[POST /api/upload/photo]', err);
    // If Cloudinary not configured yet, return helpful message
    if (err.message?.includes('cloud_name') || err.http_code === 401) {
      return res.status(503).json({
        ok:    false,
        error: 'Cloudinary not configured. Add CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET to .env',
      });
    }
    res.status(500).json({ ok: false, error: 'Upload failed' });
  }
});

// ── POST /api/upload/poster ───────────────────────────────────────────────
// Save the final generated poster canvas (base64 PNG) to Cloudinary.
// Body: { slug, dataUrl, generationId? }
router.post('/poster', async (req, res) => {
  try {
    const { slug, dataUrl, generationId } = req.body;

    if (!dataUrl?.startsWith('data:image/')) {
      return res.status(400).json({ ok: false, error: 'Invalid dataUrl' });
    }

    const result = await uploadDataUrl(dataUrl, {
      folder:    'gemma 4/generated',
      public_id: `poster_${slug || 'event'}_${Date.now()}`,
      tags:      ['generated-poster', slug || 'gemma4-kozhikode'],
      eager: [
        { width: 540, height: 675, crop: 'fill', quality: 'auto' },
      ],
    });

    // Store the Cloudinary URL back in MongoDB if we have a generation ID
    if (generationId) {
      await PosterGeneration.findByIdAndUpdate(generationId, {
        cloudinaryUrl:    result.secure_url,
        cloudinaryId:     result.public_id,
        thumbnailUrl:     result.eager?.[0]?.secure_url || null,
        downloaded:       true,
      }).catch(() => {}); // non-fatal
    }

    res.json({
      ok:           true,
      url:          result.secure_url,
      thumbnailUrl: result.eager?.[0]?.secure_url || null,
      publicId:     result.public_id,
      shareLink:    `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${result.public_id}`,
    });
  } catch (err) {
    console.error('[POST /api/upload/poster]', err);
    if (err.message?.includes('cloud_name') || err.http_code === 401) {
      return res.status(503).json({
        ok:    false,
        error: 'Cloudinary not configured. Add credentials to .env',
      });
    }
    res.status(500).json({ ok: false, error: 'Poster save failed' });
  }
});

// ── POST /api/upload/template ─────────────────────────────────────────────
// Organizer uploads a custom poster template image → stored in Cloudinary,
// URL saved in MongoDB EventConfig. Canvas uses it as the base background.
router.post('/template', upload.single('template'), async (req, res) => {
  try {
    const { slug = 'gemma4-kozhikode', sessionEmail, sessionPassword, keyword } = req.body;

    if (!sessionEmail || !sessionPassword) {
      return res.status(401).json({ ok: false, error: 'Authentication credentials are required' });
    }

    const auth = await verifyAuth(slug, sessionEmail, sessionPassword);
    if (!auth.ok) {
      return res.status(403).json({ ok: false, error: 'Unauthorized to modify this event configuration' });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }

    const cleanedKeyword = keyword ? keyword.trim() : null;

    // Upload new template
    const result = await uploadBuffer(req.file.buffer, {
      folder:         'gemma 4/templates',
      public_id:      `template_${slug}_${cleanedKeyword ? `${cleanedKeyword.toLowerCase().replace(/[^a-z0-9]/g, '_')}_` : ''}${Date.now()}`,
      tags:           ['template', slug],
      transformation: [], // keep original dimensions for templates
    });

    let config;
    if (cleanedKeyword) {
      // Find event config and insert/update keyword template
      const existing = await EventConfig.findOne({ slug });
      if (!existing) {
        config = new EventConfig({
          slug,
          templates: [{ keyword: cleanedKeyword, templateUrl: result.secure_url, templatePublicId: result.public_id }]
        });
        await config.save();
      } else {
        const idx = existing.templates.findIndex(t => t.keyword.toLowerCase() === cleanedKeyword.toLowerCase());
        if (idx > -1) {
          // Delete old asset from Cloudinary
          await deleteAsset(existing.templates[idx].templatePublicId).catch(() => {});
          // Overwrite existing
          existing.templates[idx].templateUrl = result.secure_url;
          existing.templates[idx].templatePublicId = result.public_id;
        } else {
          // Add new
          existing.templates.push({
            keyword: cleanedKeyword,
            templateUrl: result.secure_url,
            templatePublicId: result.public_id
          });
        }
        config = await existing.save();
      }
    } else {
      // Delete old default template from Cloudinary if one exists
      const existing = await EventConfig.findOne({ slug });
      if (existing?.templatePublicId) {
        await deleteAsset(existing.templatePublicId).catch(() => {});
      }

      // Persist URL in MongoDB
      config = await EventConfig.findOneAndUpdate(
        { slug },
        {
          $set: {
            templateUrl:      result.secure_url,
            templatePublicId: result.public_id,
          },
          $setOnInsert: { slug },
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    res.json({
      ok:          true,
      templateUrl: result.secure_url,
      publicId:    result.public_id,
      width:       result.width,
      height:      result.height,
      config,
    });
  } catch (err) {
    console.error('[POST /api/upload/template]', err);
    if (err.http_code === 401) {
      return res.status(503).json({ ok: false, error: 'Cloudinary credentials invalid' });
    }
    res.status(500).json({ ok: false, error: 'Template upload failed' });
  }
});

// ── DELETE /api/upload/template/:slug ─────────────────────────────────────
// Remove a template (either default or keyword-based)
router.delete('/template/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { email, password, keyword } = req.query;

    if (!email || !password) {
      return res.status(401).json({ ok: false, error: 'Authentication credentials are required' });
    }

    const auth = await verifyAuth(slug, email, password);
    if (!auth.ok) {
      return res.status(403).json({ ok: false, error: 'Unauthorized to modify this event configuration' });
    }

    let config;
    if (keyword) {
      const existing = await EventConfig.findOne({ slug });
      if (existing) {
        const matched = existing.templates.find(t => t.keyword.toLowerCase() === keyword.toLowerCase());
        if (matched) {
          await deleteAsset(matched.templatePublicId).catch(() => {});
        }
      }
      config = await EventConfig.findOneAndUpdate(
        { slug },
        { $pull: { templates: { keyword } } },
        { returnDocument: 'after' }
      );
    } else {
      const existing = await EventConfig.findOne({ slug });
      if (existing?.templatePublicId) {
        await deleteAsset(existing.templatePublicId).catch(() => {});
      }
      config = await EventConfig.findOneAndUpdate(
        { slug },
        { $set: { templateUrl: null, templatePublicId: null } },
        { returnDocument: 'after' }
      );
    }

    res.json({ ok: true, message: 'Template removed', config });
  } catch (err) {
    console.error('[DELETE /api/upload/template/:slug]', err);
    res.status(500).json({ ok: false, error: 'Failed to remove template' });
  }
});

// ── POST /api/upload/background ───────────────────────────────────────────
// Organizer uploads a custom page background image → stored in Cloudinary,
// URL saved in MongoDB EventConfig.
router.post('/background', upload.single('background'), async (req, res) => {
  try {
    const { slug = 'gemma4-kozhikode', sessionEmail, sessionPassword } = req.body;

    if (!sessionEmail || !sessionPassword) {
      return res.status(401).json({ ok: false, error: 'Authentication credentials are required' });
    }

    const auth = await verifyAuth(slug, sessionEmail, sessionPassword);
    if (!auth.ok) {
      return res.status(403).json({ ok: false, error: 'Unauthorized to modify this event configuration' });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }

    // Delete old background from Cloudinary if one exists
    const existing = await EventConfig.findOne({ slug });
    if (existing?.backgroundImagePublicId) {
      await deleteAsset(existing.backgroundImagePublicId).catch(() => {});
    }

    // Upload new background
    const result = await uploadBuffer(req.file.buffer, {
      folder:         'gemma 4/backgrounds',
      public_id:      `bg_${slug}_${Date.now()}`,
      tags:           ['background', slug],
      transformation: [], // keep original dimensions
    });

    // Persist URL in MongoDB
    const config = await EventConfig.findOneAndUpdate(
      { slug },
      {
        $set: {
          backgroundImageUrl:      result.secure_url,
          backgroundImagePublicId: result.public_id,
        },
        $setOnInsert: { slug },
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.json({
      ok:                 true,
      backgroundImageUrl: result.secure_url,
      publicId:           result.public_id,
      width:              result.width,
      height:             result.height,
      config,
    });
  } catch (err) {
    console.error('[POST /api/upload/background]', err);
    if (err.http_code === 401) {
      return res.status(503).json({ ok: false, error: 'Cloudinary credentials invalid' });
    }
    res.status(500).json({ ok: false, error: 'Background upload failed' });
  }
});

// ── DELETE /api/upload/background/:slug ───────────────────────────────────
// Remove the custom background for a slug
router.delete('/background/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { email, password } = req.query;

    if (!email || !password) {
      return res.status(401).json({ ok: false, error: 'Authentication credentials are required' });
    }

    const auth = await verifyAuth(slug, email, password);
    if (!auth.ok) {
      return res.status(403).json({ ok: false, error: 'Unauthorized to modify this event configuration' });
    }

    const existing = await EventConfig.findOne({ slug });
    if (existing?.backgroundImagePublicId) {
      await deleteAsset(existing.backgroundImagePublicId).catch(() => {});
    }
    await EventConfig.findOneAndUpdate(
      { slug },
      { $set: { backgroundImageUrl: null, backgroundImagePublicId: null } }
    );
    res.json({ ok: true, message: 'Background image removed' });
  } catch (err) {
    console.error('[DELETE /api/upload/background/:slug]', err);
    res.status(500).json({ ok: false, error: 'Failed to remove background image' });
  }
});

// ── POST /api/upload/banner ────────────────────────────────────────────────
// Organizer uploads a custom Event Information banner image → stored in Cloudinary,
// URL saved in MongoDB EventConfig.
router.post('/banner', upload.single('banner'), async (req, res) => {
  try {
    const { slug = 'gemma4-kozhikode', sessionEmail, sessionPassword } = req.body;

    if (!sessionEmail || !sessionPassword) {
      return res.status(401).json({ ok: false, error: 'Authentication credentials are required' });
    }

    const auth = await verifyAuth(slug, sessionEmail, sessionPassword);
    if (!auth.ok) {
      return res.status(403).json({ ok: false, error: 'Unauthorized to modify this event configuration' });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }

    // Delete old banner from Cloudinary if one exists
    const existing = await EventConfig.findOne({ slug });
    if (existing?.bannerPublicId) {
      await deleteAsset(existing.bannerPublicId).catch(() => {});
    }

    // Upload new banner
    const result = await uploadBuffer(req.file.buffer, {
      folder:         'gemma 4/banners',
      public_id:      `banner_${slug}_${Date.now()}`,
      tags:           ['banner', slug],
      transformation: [], // keep original dimensions
    });

    // Persist URL in MongoDB
    const config = await EventConfig.findOneAndUpdate(
      { slug },
      {
        $set: {
          bannerUrl:      result.secure_url,
          bannerPublicId: result.public_id,
        },
        $setOnInsert: { slug },
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.json({
      ok:        true,
      bannerUrl: result.secure_url,
      publicId:  result.public_id,
      width:     result.width,
      height:    result.height,
      config,
    });
  } catch (err) {
    console.error('[POST /api/upload/banner]', err);
    if (err.http_code === 401) {
      return res.status(503).json({ ok: false, error: 'Cloudinary credentials invalid' });
    }
    res.status(500).json({ ok: false, error: 'Banner upload failed' });
  }
});

// ── DELETE /api/upload/banner/:slug ────────────────────────────────────────
// Remove the custom banner for a slug
router.delete('/banner/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { email, password } = req.query;

    if (!email || !password) {
      return res.status(401).json({ ok: false, error: 'Authentication credentials are required' });
    }

    const auth = await verifyAuth(slug, email, password);
    if (!auth.ok) {
      return res.status(403).json({ ok: false, error: 'Unauthorized to modify this event configuration' });
    }

    const existing = await EventConfig.findOne({ slug });
    if (existing?.bannerPublicId) {
      await deleteAsset(existing.bannerPublicId).catch(() => {});
    }
    await EventConfig.findOneAndUpdate(
      { slug },
      { $set: { bannerUrl: null, bannerPublicId: null } }
    );
    res.json({ ok: true, message: 'Banner removed' });
  } catch (err) {
    console.error('[DELETE /api/upload/banner/:slug]', err);
    res.status(500).json({ ok: false, error: 'Failed to remove banner' });
  }
});


// ── Error handler for multer errors ──────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ ok: false, error: 'File too large (max 10 MB)' });
  }
  res.status(400).json({ ok: false, error: err.message });
});

export default router;
