import cron from 'node-cron';

const PORT = process.env.PORT || 3001;
// Render automatically populates process.env.RENDER_EXTERNAL_URL on its web services
const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
const frontendUrl = baseUrl;
const backendUrl = `${baseUrl}/api/health`;

export function initKeepAlive() {
  console.log(`[Keep-Alive Cron] Initialized self-ping job targeting:`);
  console.log(`  ➜  Frontend: ${frontendUrl}`);
  console.log(`  ➜  Backend:  ${backendUrl}`);

  // Schedule task to run every 13 minutes (*/13 * * * *)
  cron.schedule('*/13 * * * *', async () => {
    console.log(`[Keep-Alive Cron] Starting self-pings at ${new Date().toISOString()}...`);
    
    // 1. Ping Frontend (Root Page)
    try {
      const res = await fetch(frontendUrl);
      console.log(`[Keep-Alive Cron] Frontend ping response: status ${res.status}`);
    } catch (err) {
      console.error('[Keep-Alive Cron] Frontend ping failed:', err.message);
    }

    // 2. Ping Backend (API Health Check)
    try {
      const res = await fetch(backendUrl);
      const data = await res.json();
      console.log(`[Keep-Alive Cron] Backend ping response: status ${res.status}, ok: ${data?.ok}`);
    } catch (err) {
      console.error('[Keep-Alive Cron] Backend ping failed:', err.message);
    }
  });
}
