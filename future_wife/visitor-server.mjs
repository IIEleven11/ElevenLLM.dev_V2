import { createServer } from 'node:http';
import { mkdir, open, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const siteDir = dirname(fileURLToPath(import.meta.url));
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/lilycave.png', ['lilycave.png', 'image/png']],
]);

export async function createSiteServer({ logDir = join(homedir(), '.local', 'state', 'lily-site') } = {}) {
  await mkdir(logDir, { recursive: true, mode: 0o700 });
  const directory = await stat(logDir);
  if (!directory.isDirectory() || (directory.mode & 0o077) !== 0) {
    throw new Error(`Log directory must be private (mode 0700): ${logDir}`);
  }

  const log = await open(join(logDir, 'visits.jsonl'), 'a', 0o600);
  const logInfo = await log.stat();
  if (!logInfo.isFile() || (logInfo.mode & 0o077) !== 0) {
    await log.close();
    throw new Error('Visit log must be a private regular file (mode 0600).');
  }

  const server = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
      }

      const path = new URL(req.url, 'http://localhost').pathname;
      const asset = assets.get(path);
      if (!asset) {
        res.writeHead(404).end('Not found');
        return;
      }

      const [filename, contentType] = asset;
      const content = await readFile(join(siteDir, filename));
      if (filename === 'index.html' && req.method === 'GET') {
        const visit = {
          timestamp: new Date().toISOString(),
          ip: req.socket.remoteAddress ?? 'unknown',
          userAgent: (req.headers['user-agent'] ?? '').slice(0, 512),
        };
        await log.appendFile(`${JSON.stringify(visit)}\n`);
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.length,
        'Cache-Control': filename === 'index.html' ? 'no-store' : 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      console.error('Failed to serve or log request:', error);
      if (!res.headersSent) res.writeHead(500);
      res.end('Internal server error');
    }
  });
  server.on('close', () => {
    log.close().catch(error => console.error('Failed to close visit log:', error));
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT ?? 8080);
  const host = process.env.HOST ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const server = await createSiteServer();
  server.on('error', error => console.error('Server error:', error));
  server.listen(port, host, () => console.log(`Lily site listening on http://${host}:${port}`));
}
