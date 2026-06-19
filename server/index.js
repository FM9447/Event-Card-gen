import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import configRoutes from './routes/config.js';
import posterRoutes from './routes/poster.js';
import uploadRoutes from './routes/upload.js';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Increase JSON limit to handle base64 logos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request logger (dev only) ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'Gemma 4 Poster API',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
  });
});

app.use('/api/config', configRoutes);
app.use('/api/poster', posterRoutes);
app.use('/api/upload', uploadRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log('');
    console.log('  ✦ Gemma 4 Poster API');
    console.log(`  ➜  http://localhost:${PORT}`);
    console.log(`  ➜  Health: http://localhost:${PORT}/api/health`);
    console.log('');
  });
}

start();
