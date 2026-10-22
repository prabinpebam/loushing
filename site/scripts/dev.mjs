// Local preview: builds the site, serves it on loopback, rebuilds on every change
// and reloads open pages. A failed build keeps the last good output and shows the
// error in the browser, so the preview never goes down.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { watch, existsSync, statSync, createReadStream } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const dist = join(root, 'site', 'dist');
const port = Number(process.env.PORT || 4180);
const host = '127.0.0.1';
const watched = ['site/src', 'site/scripts', 'catalog', 'design', 'external', 'stacks', 'skills'];

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.zip': 'application/zip', '.ico': 'image/x-icon',
};

let lastError = null;
let building = false;
let queued = false;
const clients = new Set();

function build() {
  if (building) { queued = true; return; }
  building = true;
  const started = Date.now();
  const child = spawn(process.execPath, [join(root, 'site', 'scripts', 'build.mjs'), '--dev'], { cwd: root });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('close', (code) => {
    building = false;
    if (code === 0) {
      lastError = null;
      console.log(`[dev] built in ${Date.now() - started} ms`);
    } else {
      lastError = out.trim() || `Build exited with code ${code}`;
      console.log(`[dev] build failed; serving the last good build\n${lastError}`);
    }
    for (const res of clients) res.write(`data: ${lastError ? 'error' : 'reload'}\n\n`);
    if (queued) { queued = false; build(); }
  });
}

let timer;
for (const dir of watched) {
  const full = join(root, dir);
  if (!existsSync(full)) continue;
  watch(full, { recursive: true }, (_event, file) => {
    if (file && /(^|[\\/])(dist|drafts)([\\/]|$)/.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(build, 120);
  });
}

const reloadScript = `<script>(()=>{const s=new EventSource('/__dev/events');s.onmessage=()=>location.reload();})();</script>`;

function errorPage() {
  const esc = lastError.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  return `<div style="position:fixed;inset:auto 1rem 1rem 1rem;max-height:40vh;overflow:auto;z-index:9999;background:#1b1816;color:#fdfbf7;font:13px/1.5 ui-monospace,monospace;padding:1rem;border-radius:8px;border:2px solid #ff9a9a"><strong>Build failed, showing the last good build.</strong><pre style="white-space:pre-wrap;margin:.5rem 0 0">${esc}</pre></div>`;
}

createServer((req, res) => {
  const url = new URL(req.url, `http://${host}`);
  if (url.pathname === '/__dev/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  let path = decodeURIComponent(url.pathname);
  let file = join(dist, path);
  if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file) && existsSync(file + '.html')) file = file + '.html';
  let status = 200;
  if (!existsSync(file)) { status = 404; file = join(dist, '404.html'); }
  if (!existsSync(file)) { res.writeHead(503, { 'content-type': 'text/plain' }).end('Building...'); return; }
  const type = types[extname(file)] || 'application/octet-stream';
  res.setHeader('cache-control', 'no-store');
  if (type.startsWith('text/html')) {
    import('node:fs').then(({ readFileSync }) => {
      let html = readFileSync(file, 'utf8');
      const extra = reloadScript + (lastError ? errorPage() : '');
      html = html.includes('</body>') ? html.replace('</body>', `${extra}</body>`) : html + extra;
      res.writeHead(status, { 'content-type': type }).end(html);
    });
    return;
  }
  res.writeHead(status, { 'content-type': type });
  createReadStream(file).pipe(res);
}).listen(port, host, () => {
  console.log(`[dev] Loushing preview at http://${host}:${port}/`);
  build();
});
