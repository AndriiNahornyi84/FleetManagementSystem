import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './src/server/db.js';
import { seedDemoData } from './src/server/seed.js';
import { apiRouter } from './src/server/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  // Parse JSON payloads
  app.use(express.json());

  // Initialize SQLite database and seed initial demo data
  console.log('[Fleet Control] Initializing SQLite database...');
  initDatabase();
  seedDemoData(false);

  // Mount API router
  app.use('/api', apiRouter);

  if (!isProduction) {
    // Development mode: Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Fleet Control] Vite development middleware attached');
  } else {
    // Production mode: serve built assets
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('[Fleet Control] Serving production static files from dist');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Fleet Control] LogiTrans Fleet Management System running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Fleet Control] Failed to start server:', err);
  process.exit(1);
});
