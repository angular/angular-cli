/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

const MAIN_OUTPUT = 'dist/browser/main.js';
const NAMED_LAZY_OUTPUT = 'dist/browser/lazy-module-7QZXF7K7.js';
const UNNAMED_LAZY_OUTPUT = 'dist/browser/chunk-OW5RYMPM.js';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "namedChunks"', () => {
    beforeEach(async () => {
      // Setup a lazy loaded chunk
      await harness.writeFiles({
        'src/lazy-module.ts': 'export const value = 42;',
        'src/main.ts': `import('./lazy-module');`,
      });
    });

    it('generates named files in output when true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        namedChunks: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile(MAIN_OUTPUT).toExist();
      harness.expectFile(NAMED_LAZY_OUTPUT).toExist();
      harness.expectFile(UNNAMED_LAZY_OUTPUT).toNotExist();
    });

    it('does not generate named files in output when false', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        namedChunks: false,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile(MAIN_OUTPUT).toExist();
      harness.expectFile(NAMED_LAZY_OUTPUT).toNotExist();
      harness.expectFile(UNNAMED_LAZY_OUTPUT).toExist();
    });

    it('does not generates named files in output when not present', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile(MAIN_OUTPUT).toExist();
      harness.expectFile(NAMED_LAZY_OUTPUT).toNotExist();
      harness.expectFile(UNNAMED_LAZY_OUTPUT).toExist();
    });
  });
});
