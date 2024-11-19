/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: "jasmine.clock()"', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });

    it('can install and uninstall the mock clock', async () => {
      await harness.writeFiles({
        './src/app/app.component.spec.ts': `
            import { AppComponent } from './app.component';

            describe('Using jasmine.clock()', () => {
              beforeEach(async () => {
                jasmine.clock().install();
              });

              afterEach(() => {
                jasmine.clock().uninstall();
              });

              it('runs a basic test case', () => {
                expect(!!AppComponent).toBe(true);
              });
            });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
