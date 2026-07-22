import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { fetchPublicText, UnsafeNetworkTargetError } from '../src/network-security.js';

test('fetchPublicText limita el cuerpo y mantiene el timeout durante la lectura', async (t) => {
  const previousAllowPrivateNetworks = process.env.RADAR_ALLOW_PRIVATE_NETWORKS;
  process.env.RADAR_ALLOW_PRIVATE_NETWORKS = 'true';

  const server = createServer((request, response) => {
    if (request.url === '/large') {
      response.writeHead(200, { 'content-type': 'text/plain' });
      response.write('a'.repeat(32));
      response.end('b'.repeat(32));
      return;
    }

    if (request.url === '/slow') {
      response.writeHead(200, { 'content-type': 'text/plain' });
      response.flushHeaders();
      setTimeout(() => response.end('ok'), 200);
      return;
    }

    response.writeHead(404);
    response.end();
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  t.after(async () => {
    if (previousAllowPrivateNetworks === undefined) {
      delete process.env.RADAR_ALLOW_PRIVATE_NETWORKS;
    } else {
      process.env.RADAR_ALLOW_PRIVATE_NETWORKS = previousAllowPrivateNetworks;
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  await assert.rejects(
    fetchPublicText(`${baseUrl}/large`, { maximumBytes: 16 }),
    UnsafeNetworkTargetError,
  );

  await assert.rejects(
    fetchPublicText(`${baseUrl}/slow`, { timeoutMs: 25, maximumBytes: 1024 }),
    UnsafeNetworkTargetError,
  );
});
