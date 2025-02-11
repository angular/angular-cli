/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { executeDevServer } from '../../index';
import { executeOnceAndGet } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

const FETCH_HEADERS = Object.freeze({ host: 'example.com' });

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget, isVite) => {
  describe('option: "allowedHosts"', () => {
    beforeEach(async () => {
      setupTarget(harness);

      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', '');
    });

    it('does not allow an invalid host when option is not present', async () => {
      harness.useTarget('serve', { ...BASE_OPTIONS });

      const { result, response, content } = await executeOnceAndGet(harness, '/', {
        request: { headers: FETCH_HEADERS },
      });

      expect(result?.success).toBeTrue();
      if (isVite) {
        expect(response?.statusCode).toBe(403);
      } else {
        expect(content).toBe('Invalid Host header');
      }
    });

    it('does not allow an invalid host when option is an empty array', async () => {
      harness.useTarget('serve', { ...BASE_OPTIONS, allowedHosts: [] });

      const { result, response, content } = await executeOnceAndGet(harness, '/', {
        request: { headers: FETCH_HEADERS },
      });

      expect(result?.success).toBeTrue();
      if (isVite) {
        expect(response?.statusCode).toBe(403);
      } else {
        expect(content).toBe('Invalid Host header');
      }
    });

    it('allows a host when specified in the option', async () => {
      harness.useTarget('serve', { ...BASE_OPTIONS, allowedHosts: ['example.com'] });

      const { result, content } = await executeOnceAndGet(harness, '/', {
        request: { headers: FETCH_HEADERS },
      });

      expect(result?.success).toBeTrue();
      expect(content).toContain('<title>');
    });
  });
});
