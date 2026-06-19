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

// ── POST /api/config/login ─────────────────────────────────────────────────────
// Authenticates an organizer globally and returns all events they have access to.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required' });
    }

    const cleanEmail = email.trim();

    // 1. Master admin check
    if (cleanEmail.toLowerCase() === 'fm9447' && password === '944794') {
      const allEvents = await EventConfig.find({});
      return res.json({ ok: true, isMaster: true, events: allEvents });
    }

    // 2. Find events where this user is the owner or whitelisted
    const events = await EventConfig.find({
      $and: [
        { adminPassword: password },
        {
          $or: [
            { adminEmail: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } },
            { allowedEmails: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } }
          ]
        }
      ]
    });

    res.json({
      ok: true,
      isMaster: false,
      events
    });
  } catch (err) {
    console.error('[POST /api/config/login]', err);
    res.status(500).json({ ok: false, error: 'Login failed' });
  }
});

// ── POST /api/config/create ───────────────────────────────────────────────────
// Creates or claims a new event slug for a logged-in user.
router.post('/create', async (req, res) => {
  try {
    const { slug, eventName, sessionEmail, sessionPassword } = req.body;
    if (!slug || !sessionEmail || !sessionPassword) {
      return res.status(400).json({ ok: false, error: 'Slug, email, and password are required' });
    }

    const cleanSlug = slug.trim().toLowerCase();
    const cleanEmail = sessionEmail.trim();

    // Validate slug pattern (alphanumeric and dashes)
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      return res.status(400).json({ ok: false, error: 'Event slug must contain only lowercase letters, numbers, and dashes.' });
    }

    // Check if slug already exists
    let existing = await EventConfig.findOne({ slug: cleanSlug });
    if (existing && existing.adminEmail) {
      if (existing.adminEmail.toLowerCase() !== cleanEmail.toLowerCase()) {
        return res.status(400).json({ ok: false, error: `The event slug '${cleanSlug}' is already claimed by another organizer.` });
      }
      return res.json({ ok: true, config: existing });
    }

    // Create or claim it
    const updates = {
      slug: cleanSlug,
      adminEmail: cleanEmail,
      adminPassword: sessionPassword,
    };
    if (eventName) {
      updates.eventName = eventName;
    }

    const config = await EventConfig.findOneAndUpdate(
      { slug: cleanSlug },
      { $set: updates },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ ok: true, config });
  } catch (err) {
    console.error('[POST /api/config/create]', err);
    res.status(500).json({ ok: false, error: 'Failed to create event' });
  }
});

export default router;
