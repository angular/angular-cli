/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { URL } from 'node:url';
import { executeDevServer } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(
  executeDevServer,
  DEV_SERVER_BUILDER_INFO,
  (harness, setupTarget, isViteRun) => {
    describe('option: "servePath"', () => {
      beforeEach(async () => {
        setupTarget(harness, {
          assets: ['src/assets'],
        });

        // Application code is not needed for these tests
        await harness.writeFile('src/main.ts', 'console.log("foo");');
      });

      it('serves application at the root when option is not present', async () => {
        harness.useTarget('serve', {
          ...BASE_OPTIONS,
        });

        const { result, response } = await executeOnceAndFetch(harness, '/main.js');

        expect(result?.success).toBeTrue();
        const baseUrl = new URL(`${result?.baseUrl}`);
        expect(baseUrl.pathname).toBe('/');
        expect(await response?.text()).toContain('console.log');
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
        expect(await response?.text()).toContain('console.log');
      });

      // TODO(fix-vite): currently this is broken in vite.
      (isViteRun ? xit : it)('does not rewrite from root when option is used', async () => {
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

      it('serves assets at specified path when option is used', async () => {
        await harness.writeFile('src/assets/test.txt', 'hello world!');

        harness.useTarget('serve', {
          ...BASE_OPTIONS,
          servePath: 'test',
        });

        const { result, response } = await executeOnceAndFetch(harness, '/test/assets/test.txt', {
          // fallback processing requires an accept header
          request: { headers: { accept: 'text/html' } },
        });

        expect(result?.success).toBeTrue();
        expect(await response?.text()).toContain('hello world');
      });
    });
  },
);
