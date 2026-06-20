import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { removeBackground } from '@imgly/background-removal-node';

const app = express();

// Configure CORS to allow the main poster generator site to talk to this service
// You can lock this down to your specific Render URL later if you want
app.use(cors({
  origin: '*', 
  methods: ['POST', 'OPTIONS'],
}));

// Configure Multer to accept image files up to 10MB into memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.get('/', (req, res) => {
  res.send('Poster Gen AI Background Removal Service is running!');
});

app.post('/remove-bg', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No image file provided in "photo" field.' });
    }

    console.log(`[INFO] Received image for background removal: ${req.file.originalname} (${req.file.size} bytes)`);

    // 1. Convert Multer buffer to a standard Blob so @imgly can process it
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });

    // 2. Process using @imgly ML model
    const resultBlob = await removeBackground(blob);

    // 3. Convert the resulting transparent blob back into base64
    const arrayBuffer = await resultBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:image/png;base64,${buffer.toString('base64')}`;

    console.log(`[INFO] Background removal complete!`);

    res.json({ ok: true, dataUrl: base64 });
  } catch (err) {
    console.error('[ERROR] Background removal failed:', err);
    res.status(500).json({ ok: false, error: 'Failed to process image background' });
  }
});

// Azure App Service provides the PORT in the environment variables
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Azure Background Removal Service listening on port ${port}`);
});
