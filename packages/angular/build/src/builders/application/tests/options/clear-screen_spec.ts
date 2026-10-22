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
  describe('Option: "clearScreen"', () => {
    beforeEach(async () => {
      await harness.writeFile('src/main.ts', 'console.log("TEST");');
    });

    for (const clearScreen of [true, false]) {
      it(`should ${clearScreen ? '' : 'not '}clear the screen before a rebuild when ${clearScreen}`, async () => {
        const clearSpy = spyOn(console, 'clear');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          watch: true,
          clearScreen,
        });

        await harness.executeWithCases([
          async ({ result }) => {
            expect(result?.success).toBeTrue();
            expect(clearSpy).not.toHaveBeenCalled();

            await harness.writeFile('src/main.ts', 'console.log("CHANGED");');
          },
          ({ result }) => {
            expect(result?.success).toBeTrue();
            expect(clearSpy).toHaveBeenCalledTimes(clearScreen ? 1 : 0);
          },
        ]);
      });
    }
  });
});
