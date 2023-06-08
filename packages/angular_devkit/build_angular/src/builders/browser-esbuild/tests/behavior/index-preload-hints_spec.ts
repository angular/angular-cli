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
  describe('Behavior: "Preload hints"', () => {
    it('should add preload hints for transitive global style imports', async () => {
      await harness.writeFile(
        'src/styles.css',
        `
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono&family=Roboto:wght@300;400;500;700&display=swap');
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      harness
        .expectFile('dist/index.html')
        .content.toContain(
          '<link rel="preload" href="https://fonts.googleapis.com/css2?family=Roboto+Mono&family=Roboto:wght@300;400;500;700&display=swap">',
        );
    });
  });
});
