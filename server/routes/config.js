import { Router } from 'express';
import EventConfig from '../models/EventConfig.js';
import { verifyAuth } from '../auth.js';

const router = Router();

// ── GET /api/config/:slug ─────────────────────────────────────────────────────
// Returns the event config for a slug. Creates default doc if first visit.
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // findOneAndUpdate with upsert ensures we always return a document
    const config = await EventConfig.findOneAndUpdate(
      { slug },
      { $setOnInsert: { slug } },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ ok: true, config });
  } catch (err) {
    console.error('[GET /api/config/:slug]', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch config' });
  }
});

// ── POST /api/config/:slug/verify ──────────────────────────────────────────────
// Verifies if user has organizer/admin credentials for the slug.
router.post('/:slug/verify', async (req, res) => {
  try {
    const { slug } = req.params;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email/username and password are required' });
    }

    const auth = await verifyAuth(slug, email, password);
    if (!auth.ok) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials or unauthorized' });
    }

    res.json({
      ok: true,
      isMaster: !!auth.isMaster,
      isCreator: !!auth.isCreator,
      isWhitelisted: !!auth.isWhitelisted,
    });
  } catch (err) {
    console.error('[POST /api/config/:slug/verify]', err);
    res.status(500).json({ ok: false, error: 'Verification failed' });
  }
});

// ── PUT /api/config/:slug ─────────────────────────────────────────────────────
// Organizer saves updated event config fields
router.put('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { sessionEmail, sessionPassword } = req.body;

    if (!sessionEmail || !sessionPassword) {
      return res.status(401).json({ ok: false, error: 'Authentication credentials are required to save changes' });
    }

    const auth = await verifyAuth(slug, sessionEmail, sessionPassword);
    if (!auth.ok) {
      return res.status(403).json({ ok: false, error: 'Unauthorized to modify this event configuration' });
    }

    // Whitelist allowed fields
    const allowed = [
      'eventName', 'location', 'date', 'time', 'headerLogo', 'headerLogoHeight', 'partners',
      'templateUrl', 'templatePublicId', 'backgroundImageUrl', 'backgroundImagePublicId',
      'bannerUrl', 'bannerPublicId',
      'photoX', 'photoY', 'photoRadius', 'photoWidth', 'photoHeight', 'photoShape', 'photoRotation',
      'backgroundOpacity', 'themePrimary', 'themeSecondary', 'themeDark', 'themeCardBg', 'themeCardOpacity',
      'allowedEmails'
    ];

    // Master Admin can change adminEmail and adminPassword
    // Event creator can change adminPassword
    if (auth.isMaster) {
      allowed.push('adminEmail');
      allowed.push('adminPassword');
    } else if (auth.isCreator) {
      allowed.push('adminPassword');
    }

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const config = await EventConfig.findOneAndUpdate(
      { slug },
      { $set: updates },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ ok: true, config });
  } catch (err) {
    console.error('[PUT /api/config/:slug]', err);
    res.status(500).json({ ok: false, error: 'Failed to save config' });
  }
});

// ── DELETE /api/config/:slug/reset ───────────────────────────────────────────
// Resets event config to schema defaults (while preserving owner auth info)
router.delete('/:slug/reset', async (req, res) => {
  try {
    const { slug } = req.params;
    const sessionEmail = req.query.email;
    const sessionPassword = req.query.password;

    if (!sessionEmail || !sessionPassword) {
      return res.status(401).json({ ok: false, error: 'Authentication credentials are required' });
    }

    const auth = await verifyAuth(slug, sessionEmail, sessionPassword);
    if (!auth.ok) {
      return res.status(403).json({ ok: false, error: 'Unauthorized to reset this event configuration' });
    }

    // Keep access control info after reset so owner doesn't lose access!
    const adminEmail = auth.config?.adminEmail || '';
    const adminPassword = auth.config?.adminPassword || '';
    const allowedEmails = auth.config?.allowedEmails || [];

    await EventConfig.findOneAndDelete({ slug });

    // Re-insert with defaults but keep credentials
    const config = await EventConfig.findOneAndUpdate(
      { slug },
      { 
        $setOnInsert: { 
          slug,
          adminEmail,
          adminPassword,
          allowedEmails
        } 
      },
      { upsert: true, new: true }
    );
    res.json({ ok: true, config });
  } catch (err) {
    console.error('[DELETE /api/config/:slug/reset]', err);
    res.status(500).json({ ok: false, error: 'Failed to reset config' });
  }
});

export default router;
