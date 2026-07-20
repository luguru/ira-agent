import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertPublicHttpUrl,
  isPrivateIpAddress,
  UnsafeNetworkTargetError,
} from '../src/network-security.js';

test('identifica direcciones IPv4 no públicas', () => {
  for (const address of [
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '192.0.2.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
  ]) {
    assert.equal(isPrivateIpAddress(address), true, address);
  }

  assert.equal(isPrivateIpAddress('8.8.8.8'), false);
  assert.equal(isPrivateIpAddress('1.1.1.1'), false);
});

test('identifica direcciones IPv6 no públicas', () => {
  for (const address of [
    '::',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    '2001:db8::1',
  ]) {
    assert.equal(isPrivateIpAddress(address), true, address);
  }

  assert.equal(isPrivateIpAddress('2606:4700:4700::1111'), false);
});

test('rechaza esquemas, credenciales y destinos locales', async () => {
  for (const url of [
    'file:///etc/passwd',
    'ftp://example.com/file',
    'http://user:password@example.com',
    'http://localhost:3000',
    'http://127.0.0.1',
    'http://[::1]',
    'http://169.254.169.254/latest/meta-data',
  ]) {
    await assert.rejects(assertPublicHttpUrl(url), UnsafeNetworkTargetError, url);
  }
});
