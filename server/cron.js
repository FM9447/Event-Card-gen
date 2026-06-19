import cron from 'node-cron';

const PORT = process.env.PORT || 3001;
// Render automatically populates process.env.RENDER_EXTERNAL_URL on its web services
const pingUrl = process.env.RENDER_EXTERNAL_URL
  ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
  : `http://localhost:${PORT}/api/health`;

export function initKeepAlive() {
  console.log(`[Keep-Alive Cron] Initialized self-ping job targeting: ${pingUrl}`);

  // Schedule task to run every 13 minutes (*/13 * * * *)
  cron.schedule('*/13 * * * *', async () => {
    try {
      console.log(`[Keep-Alive Cron] Pinging self at ${new Date().toISOString()}...`);
      const res = await fetch(pingUrl);
      const data = await res.json();
      console.log(`[Keep-Alive Cron] Ping response status: ${res.status}, ok: ${data?.ok}`);
    } catch (err) {
      console.error('[Keep-Alive Cron] Failed to self-ping:', err.message);
    }
  });
}
