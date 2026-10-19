/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { executeDevServer } from '../../index';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

const SSL_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgEpythQjrJo9bm8GM
LFacGutCqc/XxDZ3dDkSMYZYZ2ehRANCAARvwtZ3OwP1uLhrcLp7nemvaWqkA+FN
NDjOA3OZKhyVHYog1jNTawJJjwk66upbXGFL8622yU1INWbZFxvrSANl
-----END PRIVATE KEY-----
`;

const SSL_CERT = `-----BEGIN CERTIFICATE-----
MIIBfzCCASWgAwIBAgIUUoRhwzxAE3y5nrOW8de+cJEIVvQwCgYIKoZIzj0EAwIw
FDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTI2MTAxOTA4NTUyNVoYDzIxMjYwOTI1
MDg1NTI1WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwWTATBgcqhkjOPQIBBggqhkjO
PQMBBwNCAARvwtZ3OwP1uLhrcLp7nemvaWqkA+FNNDjOA3OZKhyVHYog1jNTawJJ
jwk66upbXGFL8622yU1INWbZFxvrSANlo1MwUTAdBgNVHQ4EFgQUWyqB1QeFcs6L
LL7Utsybm6+XFvIwHwYDVR0jBBgwFoAUWyqB1QeFcs6LLL7Utsybm6+XFvIwDwYD
VR0TAQH/BAUwAwEB/zAKBggqhkjOPQQDAgNIADBFAiBazry25W+Qewb/WzadhmdY
YDGdshNZCk0g0DI3ctNjlgIhAKm2X8pmqdkM38Yh8QDN0cHBsAcDfRYffDnjJ3tP
dpnU
-----END CERTIFICATE-----
`;

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('option: "ssl"', () => {
    beforeEach(async () => {
      setupTarget(harness);

      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', '');
    });

    it('resolves "sslKey" and "sslCert" relative to the workspace root', async () => {
      await harness.writeFile('ssl/server.key', SSL_KEY);
      await harness.writeFile('ssl/server.crt', SSL_CERT);

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        ssl: true,
        sslKey: 'ssl/server.key',
        sslCert: 'ssl/server.crt',
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
      expect(result?.baseUrl).toMatch(/^https:\/\/[^/]+:\d+\//);
    });

    it('supports absolute "sslKey" and "sslCert" paths outside the workspace', async () => {
      const baseTmpDir = process.env['TEST_TMPDIR'];
      assert(baseTmpDir, 'TEST_TMPDIR is not set');
      const certsDir = await mkdtemp(join(baseTmpDir, 'angular-cli-ssl-'));
      const sslKey = join(certsDir, 'server.key');
      const sslCert = join(certsDir, 'server.crt');
      await writeFile(sslKey, SSL_KEY);
      await writeFile(sslCert, SSL_CERT);

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        ssl: true,
        sslKey,
        sslCert,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
      expect(result?.baseUrl).toMatch(/^https:\/\/[^/]+:\d+\//);
    });
  });
});
