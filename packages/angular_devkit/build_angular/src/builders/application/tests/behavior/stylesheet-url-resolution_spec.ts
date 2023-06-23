/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
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
