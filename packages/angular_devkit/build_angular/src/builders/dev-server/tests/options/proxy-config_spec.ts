/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as http from 'http';
import { serveWebpackBrowser } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import {
  BASE_OPTIONS,
  DEV_SERVER_BUILDER_INFO,
  describeBuilder,
  setupBrowserTarget,
} from '../setup';

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('option: "proxyConfig"', () => {
    beforeEach(async () => {
      setupBrowserTarget(harness);

      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', '');
    });

    it('proxies requests based on the JSON proxy configuration file provided in the option', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        proxyConfig: 'proxy.config.json',
      });

      const proxyServer = createProxyServer();
      try {
        await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));
        const proxyAddress = proxyServer.address() as import('net').AddressInfo;

        await harness.writeFiles({
          'proxy.config.json': `{ "/api/*": { "target": "http://127.0.0.1:${proxyAddress.port}" } }`,
        });

        const { result, response } = await executeOnceAndFetch(harness, '/api/test');

        expect(result?.success).toBeTrue();
        expect(await response?.text()).toContain('TEST_API_RETURN');
      } finally {
        await new Promise<void>((resolve) => proxyServer.close(() => resolve()));
      }
    });

    it('proxies requests based on the JS proxy configuration file provided in the option', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        proxyConfig: 'proxy.config.js',
      });

      const proxyServer = createProxyServer();
      try {
        await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));
        const proxyAddress = proxyServer.address() as import('net').AddressInfo;

        await harness.writeFiles({
          'proxy.config.js': `module.exports = { "/api/*": { "target": "http://127.0.0.1:${proxyAddress.port}" } }`,
        });

        const { result, response } = await executeOnceAndFetch(harness, '/api/test');

        expect(result?.success).toBeTrue();
        expect(await response?.text()).toContain('TEST_API_RETURN');
      } finally {
        await new Promise<void>((resolve) => proxyServer.close(() => resolve()));
      }
    });

    it('proxies requests based on the MJS proxy configuration file provided in the option', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        proxyConfig: 'proxy.config.mjs',
      });

      const proxyServer = createProxyServer();
      try {
        await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));
        const proxyAddress = proxyServer.address() as import('net').AddressInfo;

        await harness.writeFiles({
          'proxy.config.mjs': `export default { "/api/*": { "target": "http://127.0.0.1:${proxyAddress.port}" } }`,
        });

        const { result, response } = await executeOnceAndFetch(harness, '/api/test');

        expect(result?.success).toBeTrue();
        expect(await response?.text()).toContain('TEST_API_RETURN');
      } finally {
        await new Promise<void>((resolve) => proxyServer.close(() => resolve()));
      }
    });

    it('throws an error when proxy configuration file cannot be found', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        proxyConfig: 'INVALID.json',
      });

      const { result, error } = await harness.executeOnce({ outputLogsOnException: false });

      expect(result).toBeUndefined();
      expect(error).toEqual(
        jasmine.objectContaining({
          message: jasmine.stringMatching('INVALID\\.json does not exist'),
        }),
      );
    });
  });
});

/**
 * Creates an HTTP Server used for proxy testing that provides a `/test` endpoint
 * that returns a 200 response with a body of `TEST_API_RETURN`. All other requests
 * will return a 404 response.
 *
 * @returns An HTTP Server instance.
 */
function createProxyServer() {
  return http.createServer((request, response) => {
    if (request.url?.endsWith('/test')) {
      response.writeHead(200);
      response.end('TEST_API_RETURN');
    } else {
      response.writeHead(404);
      response.end();
    }
  });
}
