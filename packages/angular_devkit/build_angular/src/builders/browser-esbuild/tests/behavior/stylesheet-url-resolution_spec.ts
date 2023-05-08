/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildEsbuildBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildEsbuildBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "Stylesheet url() Resolution"', () => {
    it('should show a note when using tilde prefix', async () => {
      await harness.writeFile(
        'src/styles.css',
        `
        .a {
          background-image: url("~/image.jpg")
        }
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBe(false);

      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('You can remove the tilde and'),
        }),
      );
    });
  });
});
