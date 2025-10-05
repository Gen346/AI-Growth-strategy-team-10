import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import { exec } from 'child_process'

export default defineConfig({
  plugins: [
    react(),
    // Dev-only plugin: handle /api/scrape by running local scripts sequentially
    {
      name: 'dev-scrape-runner',
      configureServer(server) {
        if (!server) return;
        server.middlewares.use('/api/scrape', (req: any, res: any, next: any) => {
          if (req.method !== 'POST') return next();
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { url } = JSON.parse(body || '{}');
              if (!url) return res.writeHead(400).end(JSON.stringify({ error: 'No url provided' }));
              fs.writeFileSync('ads-results.json', '[]', 'utf-8');
              exec(`node ads-scraper.js "${url}"`, (err: any, _stdout: any, stderr: any) => {
                if (err) {
                  return res.writeHead(500).end(JSON.stringify({ error: stderr || err.message }));
                }
                // after scraping, run downloader to fetch videos
                exec(`node download-videos.js`, (err2: any, _stdout2: any, stderr2: any) => {
                  if (err2) {
                    return res.writeHead(500).end(JSON.stringify({ error: stderr2 || err2.message }));
                  }
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true }));
                });
              });
            } catch (e) {
              res.writeHead(400).end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
        });
      }
    }
  ],
})