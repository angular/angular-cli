/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { URL } from 'url';
import { serveWebpackBrowser } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import {
  BASE_OPTIONS,
  DEV_SERVER_BUILDER_INFO,
  describeBuilder,
  setupBrowserTarget,
} from '../setup';

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('option: "servePath"', () => {
    beforeEach(async () => {
      setupBrowserTarget(harness);

      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', '');
    });

    it('serves application at the root when option is not present', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, '/main.js');

      expect(result?.success).toBeTrue();
      const baseUrl = new URL(`${result?.baseUrl}`);
      expect(baseUrl.pathname).toBe('/');
      expect(await response?.text()).toContain('self["webpackChunktest"]');
    });

    it('serves application at specified path when option is used', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        servePath: 'test',
      });

      const { result, response } = await executeOnceAndFetch(harness, '/test/main.js');

      expect(result?.success).toBeTrue();
      const baseUrl = new URL(`${result?.baseUrl}/`);
      expect(baseUrl.pathname).toBe('/test/');
      expect(await response?.text()).toContain('self["webpackChunktest"]');
    });

    it('does not rewrite from root when option is used', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        servePath: 'test',
      });

      const { result, response } = await executeOnceAndFetch(harness, '/', {
        // fallback processing requires an accept header
        request: { headers: { accept: 'text/html' } },
      });

      expect(result?.success).toBeTrue();
      expect(response?.status).toBe(404);
    });

    it('does not rewrite from path outside serve path when option is used', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        servePath: 'test',
      });

      const { result, response } = await executeOnceAndFetch(harness, '/api/', {
        // fallback processing requires an accept header
        request: { headers: { accept: 'text/html' } },
      });

      expect(result?.success).toBeTrue();
      expect(response?.status).toBe(404);
    });

    it('rewrites from path inside serve path when option is used', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        servePath: 'test',
      });

      const { result, response } = await executeOnceAndFetch(harness, '/test/inside', {
        // fallback processing requires an accept header
        request: { headers: { accept: 'text/html' } },
      });

      expect(result?.success).toBeTrue();
      expect(await response?.text()).toContain('<title>');
    });
  });
});
