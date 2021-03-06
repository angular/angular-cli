/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { serveWebpackBrowser } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import {
  BASE_OPTIONS,
  DEV_SERVER_BUILDER_INFO,
  describeBuilder,
  setupBrowserTarget,
} from '../setup';

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('Behavior: "browser builder inline critical css"', () => {
    beforeEach(async () => {
      setupBrowserTarget(harness, {
        optimization: {
          styles: {
            minify: true,
            inlineCritical: true,
          },
        },
        styles: ['src/styles.css'],
      });

      await harness.writeFiles({
        'src/styles.css': 'body { color: #000 }',
      });

      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', '');
    });

    it('inlines critical css when enabled in the "browserTarget" options', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, '/');

      expect(result?.success).toBeTrue();
      expect(await response?.text()).toContain('body{color:#000;}');
    });
  });
});
