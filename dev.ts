// Local development server (used by `npm run dev`).
// Loads the Express app and mounts Vite in middleware mode so the React
// frontend and the API run together on http://localhost:3000.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import app from './server';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n  Sistema de Gestión Documentaria (desarrollo)');
    console.log(`  Local:  http://localhost:${PORT}\n`);
  });
}

start();
