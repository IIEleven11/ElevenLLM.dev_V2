import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { test } from 'node:test';
import { createSiteServer } from './visitor-server.mjs';

test('records page visits privately without logging assets or trusting forwarded IPs', async () => {
  const logDir = await mkdtemp(join(tmpdir(), 'lily-visits-'));
  const server = await createSiteServer({ logDir });
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${url}/?private=query`, {
      headers: { 'User-Agent': 'Test browser', 'X-Forwarded-For': '203.0.113.7' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(await response.text(), /lilycave\.png/);
    assert.equal((await fetch(`${url}/lilycave.png`)).status, 200);
    assert.equal((await fetch(`${url}/index.html`, { method: 'HEAD' })).status, 200);
    assert.equal((await fetch(`${url}/visits.jsonl`)).status, 404);
    assert.equal((await fetch(`${url}/`, { method: 'POST' })).status, 405);

    const logPath = join(logDir, 'visits.jsonl');
    const lines = (await readFile(logPath, 'utf8')).trim().split('\n');
    assert.equal(lines.length, 1);
    const visit = JSON.parse(lines[0]);
    assert.ok(!Number.isNaN(Date.parse(visit.timestamp)));
    assert.match(visit.ip, /127\.0\.0\.1$/);
    assert.equal(visit.userAgent, 'Test browser');
    assert.deepEqual(Object.keys(visit).sort(), ['ip', 'timestamp', 'userAgent']);
    assert.equal((await stat(logPath)).mode & 0o077, 0);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(logDir, { recursive: true, force: true });
  }
});

test('refuses to write logs in a non-private directory', async () => {
  const logDir = await mkdtemp(join(tmpdir(), 'lily-visits-'));
  try {
    const { chmod } = await import('node:fs/promises');
    await chmod(logDir, 0o755);
    await assert.rejects(createSiteServer({ logDir }), /Log directory must be private/);
  } finally {
    await rm(logDir, { recursive: true, force: true });
  }
});
