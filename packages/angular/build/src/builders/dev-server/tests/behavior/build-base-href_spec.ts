/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { executeDevServer } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: "buildTarget baseHref"', () => {
    beforeEach(async () => {
      setupTarget(harness, {
        baseHref: '/test/',
      });

      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', 'console.log("foo");');
    });

    it('uses the baseHref defined in the "buildTarget" options as the serve path', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, '/test/main.js');

      expect(result?.success).toBeTrue();
      const baseUrl = new URL(`${result?.baseUrl}/`);
      expect(baseUrl.pathname).toBe('/test/');
      expect(await response?.text()).toContain('console.log');
    });

    it('serves the application from baseHref location without trailing slash', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, '/test');

      expect(result?.success).toBeTrue();
      expect(await response?.text()).toContain('<script src="main.js" type="module">');
    });
  });
});
