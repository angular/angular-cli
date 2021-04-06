/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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

function getResultPort(result: Record<string, unknown> | undefined): string | undefined {
  if (typeof result?.baseUrl !== 'string') {
    fail(`Expected builder result with a string 'baseUrl' property. Received: ${result?.baseUrl}`);

    return;
  }

  try {
    return new URL(result.baseUrl).port;
  } catch {
    fail(`Expected a valid URL in builder result 'baseUrl' property. Received: ${result.baseUrl}`);
  }
}

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('option: "port"', () => {
    beforeEach(async () => {
      setupBrowserTarget(harness);

      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', '');
    });

    it('uses default port (4200) when not present', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        // Base options set port to zero
        port: undefined,
      });

      const { result, response, logs } = await executeOnceAndFetch(harness, '/');

      expect(result?.success).toBeTrue();
      expect(getResultPort(result)).toBe('4200');
      expect(await response?.text()).toContain('<title>');

      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/:4200/),
        }),
      );
    });

    it('uses a random free port when set to 0 (zero)', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        port: 0,
      });

      const { result, response, logs } = await executeOnceAndFetch(harness, '/');

      expect(result?.success).toBeTrue();
      const port = getResultPort(result);
      expect(port).not.toBe('4200');
      expect(port).toMatch(/\d{4,6}/);
      expect(await response?.text()).toContain('<title>');

      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(':' + port),
        }),
      );
    });

    it('uses specific port when a non-zero number is specified', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        port: 8000,
      });

      const { result, response, logs } = await executeOnceAndFetch(harness, '/');

      expect(result?.success).toBeTrue();
      expect(getResultPort(result)).toBe('8000');
      expect(await response?.text()).toContain('<title>');

      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(':8000'),
        }),
      );
    });
  });
});
