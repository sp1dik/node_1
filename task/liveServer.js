const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { Transform } = require('stream');
const WebSocket = require('ws');

// Default target directory is task/public (serves existing project files)
const TARGET_DIR = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

async function ensureTargetDir(dir) {
  try {
    await fsp.access(dir);
  } catch (e) {
    await fsp.mkdir(dir, { recursive: true });
  }
}

class BodyInjector extends Transform {
  constructor(script) {
    super();
    this.script = script;
    this.buffer = '';
    this.injected = false;
  }

  _transform(chunk, enc, cb) {
    if (this.injected) {
      this.push(chunk);
      return cb();
    }

    this.buffer += chunk.toString('utf8');
    const idx = this.buffer.toLowerCase().indexOf('</body>');
    if (idx !== -1) {
      const before = this.buffer.slice(0, idx);
      const after = this.buffer.slice(idx);
      const out = before + this.script + after;
      this.push(out);
      this.injected = true;
      this.buffer = '';
      return cb();
    }

    // Keep buffer limited in size to avoid memory blowup
    if (this.buffer.length > 64 * 1024) {
      const keep = this.buffer.slice(-1024);
      this.push(this.buffer.slice(0, -1024));
      this.buffer = keep;
    }
    cb();
  }

  _flush(cb) {
    if (!this.injected && this.buffer.length) {
      this.push(this.buffer + this.script);
    }
    cb();
  }
}

(async () => {
  await ensureTargetDir(TARGET_DIR);

  const server = http.createServer(async (req, res) => {
    try {
      const parsed = new URL(req.url, `http://${req.headers.host}`);
      let reqPath = decodeURIComponent(parsed.pathname);

      // Normalize and prevent traversal
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

      // Resolve absolute path and ensure it's inside TARGET_DIR
      const filePath = path.resolve(TARGET_DIR, '.' + reqPath);
      if (!filePath.startsWith(path.resolve(TARGET_DIR))) {
        res.statusCode = 400;
        res.end('Bad request');
        return;
      }

      let stat;
      try {
        stat = await fsp.stat(filePath);
        if (stat.isDirectory()) {
          // try index.html
          const idx = path.join(filePath, 'index.html');
          stat = await fsp.stat(idx);
          return streamFile(idx, res);
        }
      } catch (e) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      return streamFile(filePath, res);
    } catch (err) {
      res.statusCode = 500;
      res.end('Server error');
    }
  });

  function streamFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    if (ext === '.html') {
      const script = `\n<script>\n(function(){\n  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';\n  const ws = new WebSocket(scheme + '://' + location.host + '/livereload');\n  ws.addEventListener('message', (ev) => { try { const msg = JSON.parse(ev.data); if (msg && msg.type === 'reload') location.reload(); } catch(e){} });\n  ws.addEventListener('open', () => console.log('[live] connected'));\n  ws.addEventListener('close', () => console.log('[live] disconnected'));\n})();\n</script>\n`;
      const read = fs.createReadStream(filePath);
      const injector = new BodyInjector(script);
      read.on('error', () => {
        res.statusCode = 500;
        res.end('Stream error');
      });
      read.pipe(injector).pipe(res);
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      res.statusCode = 500;
      res.end('Stream error');
    });
    stream.pipe(res);
  }

  // WebSocket server for reload notifications
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    if (req.url === '/livereload') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'connected' }));
  });

  function broadcastReload() {
    const msg = JSON.stringify({ type: 'reload' });
    wss.clients.forEach((c) => {
      if (c.readyState === WebSocket.OPEN) c.send(msg);
    });
  }

  // Watch the target directory for changes
  try {
    fs.watch(TARGET_DIR, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      console.log('[live] change detected:', eventType, filename);
      broadcastReload();
    });
  } catch (e) {
    // fallback if recursive not supported
    fs.watch(TARGET_DIR, (eventType, filename) => {
      if (!filename) return;
      console.log('[live] change detected:', eventType, filename);
      broadcastReload();
    });
  }

  server.listen(PORT, () => {
    console.log(`[live] Server running. Serving directory: ${TARGET_DIR}`);
    console.log(`[live] Open http://localhost:${PORT}/index.html`);
  });
})();
