import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { download } from '../lib/network.mjs';
import { Catalog } from '../lib/catalog.mjs';

async function server(t, handler) {
  const instance = http.createServer(handler);
  await new Promise((resolve) => instance.listen(0, '127.0.0.1', resolve));
  t.after(() => { instance.closeAllConnections(); instance.close(); });
  return { instance, url: `http://127.0.0.1:${instance.address().port}` };
}

test('real HTTP bytes, redirects and bounded downloads', async (t) => {
  const { url } = await server(t, (req, res) => {
    if (req.url === '/redirect') { res.writeHead(302, { location: '/file' }); res.end(); }
    else res.end('A pinned file.');
  });
  const options = { env: {}, allow: (candidate) => candidate.origin === url };
  assert.equal((await download(`${url}/redirect`, options)).toString(), 'A pinned file.');
  await assert.rejects(download(`${url}/file`, { ...options, limit: 3 }), /Could not download/);
});

test('redirects cannot escape the catalog origin; credentials are not accepted', async (t) => {
  const { url } = await server(t, (_req, res) => { res.writeHead(302, { location: 'https://not-authorized.invalid/file' }); res.end(); });
  await assert.rejects(download(`${url}/file`, { env: {}, allow: (candidate) => candidate.origin === url }), /not allowed/);
  await assert.rejects(download(url.replace('http://', 'http://user:secret@'), { env: {}, allow: () => true }), /not allowed/);
});

test('HTTP proxy is used with proxy authentication and NO_PROXY bypasses it', async (t) => {
  const seen = [];
  const proxy = await server(t, (req, res) => {
    seen.push({ path: req.url, auth: req.headers['proxy-authorization'] });
    res.end('From proxy');
  });
  const proxyUrl = proxy.url.replace('http://', 'http://local:fixture@');
  const bytes = await download('http://example.invalid/file', { env: { HTTP_PROXY: proxyUrl }, allow: () => true });
  assert.equal(bytes.toString(), 'From proxy');
  assert.equal(seen[0].path, 'http://example.invalid/file');
  assert.equal(seen[0].auth, `Basic ${Buffer.from('local:fixture').toString('base64')}`);
  const direct = await server(t, (_req, res) => res.end('Direct'));
  assert.equal((await download(direct.url, { env: { HTTP_PROXY: proxyUrl, NO_PROXY: '127.0.0.1' }, allow: () => true })).toString(), 'Direct');
  assert.equal(seen.length, 1);
});

test('HTTPS proxy tunnel refusal is explicit and never leaks proxy credentials', async (t) => {
  const proxy = await server(t, (_req, res) => res.end());
  let connect;
  proxy.instance.on('connect', (req, socket) => {
    connect = req.url;
    socket.end('HTTP/1.1 407 Proxy Authentication Required\r\n\r\n');
  });
  const proxyUrl = proxy.url.replace('http://', 'http://local:fixture@');
  await assert.rejects(download('https://example.invalid/file', {
    env: { HTTPS_PROXY: proxyUrl }, allow: () => true,
  }), (error) => {
    assert.match(error.message, /example.invalid/);
    assert.doesNotMatch(error.message, /fixture|local:/);
    return true;
  });
  assert.equal(connect, 'example.invalid:443');
});

test('network cancellation aborts pending requests without a silent retry', async (t) => {
  let count = 0;
  const { url } = await server(t, () => { count++; abort.abort(); });
  const abort = new AbortController();
  await assert.rejects(download(url, { signal: abort.signal, env: {}, allow: () => true }), /Cancelled/);
  assert.equal(count, 1);
});

test('catalog over HTTP checks item identity, pin agreement and metadata origins', async (t) => {
  const pin = 'a'.repeat(40);
  let item = { id: 'one', type: 'skill', version: '1.0.0', source: { commit: pin } };
  let data = 'items/one.json';
  const { url } = await server(t, (req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(req.url === '/catalog.json'
      ? { items: [{ id: 'one', type: 'skill', version: '1.0.0', source: { commit: pin }, data }] }
      : item));
  });
  const read = () => new Catalog(`${url}/catalog.json`, { env: {} }).item('one');
  assert.equal((await read()).id, 'one');
  item = { ...item, source: { commit: 'b'.repeat(40) } };
  await assert.rejects(read(), /disagree/);
  data = 'https://not-authorized.invalid/item.json';
  await assert.rejects(read(), /not allowed/);
});
