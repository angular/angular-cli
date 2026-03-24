/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createServer } from 'node:http';
import { executeDevServer } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('option: "middlewareConfig"', () => {
    beforeEach(async () => {
      setupTarget(harness);

      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', '');
    });

    it('middleware configuration export single function (CommonJS)', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        middlewareConfig: 'middleware.config.js',
      });
      const proxyServer = await createProxyServer();
      try {
        await harness.writeFiles({
          'middleware.config.js': `module.exports = (req, res, next) => { res.end('TEST_MIDDLEWARE'); next();}`,
        });

        const { result, response } = await executeOnceAndFetch(harness, '/test');

        expect(result?.success).toBeTrue();
        expect(await response?.text()).toContain('TEST_MIDDLEWARE');
      } finally {
        await proxyServer.close();
      }
    });

    it('middleware configuration export an array of multiple functions (CommonJS)', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        middlewareConfig: 'middleware.config.js',
      });
      const proxyServer = await createProxyServer();
      try {
        await harness.writeFiles({
          'middleware.config.js': `module.exports = [(req, res, next) => { next();}, (req, res, next) => { res.end('TEST_MIDDLEWARE'); next();}]`,
        });

        const { result, response } = await executeOnceAndFetch(harness, '/test');

        expect(result?.success).toBeTrue();
        expect(await response?.text()).toContain('TEST_MIDDLEWARE');
      } finally {
        await proxyServer.close();
      }
    });
  });
});

/**
 * Creates an HTTP Server used for proxy testing that provides a `/test` endpoint
 * that returns a 200 response with a body of `TEST_API_RETURN`. All other requests
 * will return a 404 response.
 */
async function createProxyServer() {
  const proxyServer = createServer((request, response) => {
    if (request.url?.endsWith('/test')) {
      response.writeHead(200);
      response.end('TEST_API_RETURN');
    } else {
      response.writeHead(404);
      response.end();
    }
  });

  await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));

  return {
    address: proxyServer.address() as import('net').AddressInfo,
    close: () => new Promise<void>((resolve) => proxyServer.close(() => resolve())),
  };
}
