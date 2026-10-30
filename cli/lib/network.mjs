import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { isIP } from 'node:net';
import { CliError } from './safety.mjs';

const hostname = (url) => url.hostname.replace(/^\[|\]$/g, '');

function proxyFor(url, env) {
  const bypass = env.NO_PROXY ?? env.no_proxy ?? '';
  if (bypass.split(',').some((entry) => {
    const value = entry.trim().toLowerCase();
    if (value === '*') return true;
    if (!value) return false;
    const ipv6 = /^\[([^\]]+)\](?::(\d+))?$/.exec(value);
    const [host, port] = ipv6 ? [ipv6[1], ipv6[2]] : value.split(':');
    if (port && port !== (url.port || (url.protocol === 'https:' ? '443' : '80'))) return false;
    const domain = host.replace(/^\./, '');
    return hostname(url) === domain || hostname(url).endsWith(`.${domain}`);
  })) return null;
  const setting = url.protocol === 'https:' ? env.HTTPS_PROXY ?? env.https_proxy : env.HTTP_PROXY ?? env.http_proxy;
  if (!setting) return null;
  const proxy = new URL(setting);
  if (!['http:', 'https:'].includes(proxy.protocol)) throw new CliError('The configured proxy must use HTTP or HTTPS.');
  return proxy;
}

const auth = (proxy) => proxy.username || proxy.password
  ? `Basic ${Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString('base64')}` : undefined;

/** Node 22 has no fetch proxy agent. Built-in HTTP transports keep proxy support dependency-free. */
function request(url, { signal, env }) {
  const proxy = proxyFor(url, env);
  return new Promise((resolve, reject) => {
    const send = (transport, options) => {
      const req = transport.request(options, resolve);
      req.once('error', reject);
      req.end();
    };
    const headers = { 'user-agent': 'loushing/0.0.1', accept: '*/*' };
    if (!proxy) return send(url.protocol === 'https:' ? https : http, { protocol: url.protocol, hostname: hostname(url), port: url.port, path: url.pathname + url.search, headers, signal });
    const proxyHeaders = auth(proxy) ? { 'proxy-authorization': auth(proxy) } : {};
    if (url.protocol === 'http:') {
      return send(proxy.protocol === 'https:' ? https : http, { protocol: proxy.protocol, hostname: hostname(proxy), port: proxy.port, path: url.href, headers: { ...headers, ...proxyHeaders, host: url.host }, signal });
    }
    const agent = new https.Agent();
    agent.createConnection = (_options, callback) => {
      let completed = false;
      const finish = (...args) => { if (!completed) { completed = true; callback(...args); } };
      const connect = (proxy.protocol === 'https:' ? https : http).request({
        protocol: proxy.protocol, hostname: hostname(proxy), port: proxy.port, method: 'CONNECT',
        path: `${url.hostname}:${url.port || 443}`, headers: { ...proxyHeaders, host: `${url.hostname}:${url.port || 443}` }, signal,
      });
      connect.once('error', finish);
      connect.once('connect', (response, socket, head) => {
        if (response.statusCode !== 200 || head.length) {
          socket.destroy();
          finish(new Error('The proxy refused the tunnel.'));
          return;
        }
        const secure = tls.connect({ socket, servername: isIP(hostname(url)) ? undefined : hostname(url) });
        secure.once('secureConnect', () => finish(null, secure));
        secure.once('error', finish);
      });
      connect.end();
    };
    send(https, { hostname: hostname(url), port: url.port, path: url.pathname + url.search, headers, signal, agent });
  });
}

export async function download(input, { allow, limit = 6 * 1024 * 1024, signal, env = process.env } = {}) {
  let url = new URL(input);
  const timeout = AbortSignal.timeout(30_000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  for (let redirects = 0; redirects < 5; redirects++) {
    if (!allow(url) || url.username || url.password || url.hash) throw new CliError(`Downloads from ${url.hostname} are not allowed.`);
    let response;
    try {
      response = await request(url, { signal: combined, env });
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        if (!response.headers.location) throw new Error('Missing redirect destination.');
        url = new URL(response.headers.location, url);
        continue;
      }
      if (response.statusCode !== 200) { response.resume(); throw new Error(`HTTP ${response.statusCode}`); }
      if (Number(response.headers['content-length']) > limit) { response.destroy(); throw new Error('Download exceeds the size limit.'); }
      const chunks = [];
      let size = 0;
      for await (const chunk of response) {
        size += chunk.length;
        if (size > limit) { response.destroy(); throw new Error('Download exceeds the size limit.'); }
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      response?.destroy();
      if (signal?.aborted) throw new CliError('Cancelled. No install was committed.');
      throw new CliError(`Could not download from ${url.hostname}: ${error.code ?? 'network failure'}. Check HTTPS_PROXY, HTTP_PROXY and NO_PROXY, or use the item’s Download route.`);
    }
  }
  throw new CliError('Too many download redirects. Use the item’s Download route.');
}
