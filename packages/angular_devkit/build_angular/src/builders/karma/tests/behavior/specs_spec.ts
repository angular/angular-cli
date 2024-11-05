/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget, isApp) => {
  describe('Behavior: "Specs"', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });

    it('supports multiple spec files with same basename', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      const collidingBasename = 'collision.spec.ts';

      // src/app/app.component.spec.ts conflicts with this one:
      await harness.writeFiles({
        [`src/app/a/${collidingBasename}`]: `/** Success! */`,
        [`src/app/b/${collidingBasename}`]: `/** Success! */`,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBeTrue();

      if (isApp) {
        const bundleLog = logs.find((log) =>
          log.message.includes('Application bundle generation complete.'),
        );
        expect(bundleLog?.message).toContain('spec-app-a-collision.spec.js');
        expect(bundleLog?.message).toContain('spec-app-b-collision.spec.js');
      }
    });
  });
});
