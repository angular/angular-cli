/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "optimization.scripts"', () => {
    it(`should include 'setClassMetadata' calls when false`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: {
          scripts: false,
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/main.js').content.toContain('setClassMetadata(');
    });

    it(`should not include 'setClassMetadata' calls when true`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: {
          scripts: true,
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/main.js').content.not.toContain('setClassMetadata(');
    });
  });
});
