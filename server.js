import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8777);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.hdr': 'application/octet-stream', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  // tiny upload sink used by the walkthrough recorder
  if (req.method === 'POST' && (req.url || '').startsWith('/__save')) {
    const audio = (req.url || '').includes('audio');
    const out = path.join(ROOT, 'shots', 'video', audio ? 'walkthrough.m4a.webm' : 'walkthrough.webm');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const ws = fs.createWriteStream(out);
    req.pipe(ws);
    ws.on('finish', () => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok ' + fs.statSync(out).size); });
    ws.on('error', () => { res.writeHead(500); res.end('err'); });
    return;
  }
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, path.normalize(p).replace(/^([/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Cross-Origin-Opener-Policy': 'same-origin',
    });
    res.end(buf);
  });
}).listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log(`\n  回南 HUI NAM  ->  ${url}\n`);
  if (process.argv.includes('--open')) {
    exec(`start "" "${url}"`);
  }
});
