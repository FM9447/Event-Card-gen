import { Router } from 'express';
import PosterGeneration from '../models/PosterGeneration.js';

const router = Router();

// ── POST /api/poster/generated ────────────────────────────────────────────────
// Log an anonymous poster generation event (no photo data stored)
router.post('/generated', async (req, res) => {
  try {
    const { slug, bgRemoved = false, downloaded = false } = req.body;

    if (!slug) {
      return res.status(400).json({ ok: false, error: 'slug is required' });
    }

    const entry = await PosterGeneration.create({
      slug,
      bgRemoved: Boolean(bgRemoved),
      downloaded: Boolean(downloaded),
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(201).json({ ok: true, id: entry._id });
  } catch (err) {
    console.error('[POST /api/poster/generated]', err);
    res.status(500).json({ ok: false, error: 'Failed to log generation' });
  }
});

// ── PATCH /api/poster/downloaded/:id ─────────────────────────────────────────
// Mark a specific generation as downloaded
router.patch('/downloaded/:id', async (req, res) => {
  try {
    await PosterGeneration.findByIdAndUpdate(req.params.id, { downloaded: true });
    res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/poster/downloaded/:id]', err);
    res.status(500).json({ ok: false, error: 'Failed to update' });
  }
});

// ── GET /api/poster/stats/:slug ───────────────────────────────────────────────
// Get aggregated stats for organizer dashboard
router.get('/stats/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const [total, withBgRemoval, downloaded, last7Days] = await Promise.all([
      PosterGeneration.countDocuments({ slug }),
      PosterGeneration.countDocuments({ slug, bgRemoved: true }),
      PosterGeneration.countDocuments({ slug, downloaded: true }),
      PosterGeneration.countDocuments({
        slug,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    // Daily breakdown for last 7 days
    const daily = await PosterGeneration.aggregate([
      {
        $match: {
          slug,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      ok: true,
      stats: { total, withBgRemoval, downloaded, last7Days, daily },
    });
  } catch (err) {
    console.error('[GET /api/poster/stats/:slug]', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch stats' });
  }
});

export default router;
