/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

const testsVariants: [suitName: string, baseUrl: string | undefined][] = [
  ['When "baseUrl" is set to "./"', './'],
  [`When "baseUrl" is not set`, undefined],
  [`When "baseUrl" is set to non root path`, './project/foo'],
];

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: polyfills', () => {
    for (const [suitName, baseUrl] of testsVariants) {
      describe(suitName, () => {
        beforeEach(async () => {
          await harness.modifyFile('tsconfig.json', (content) => {
            const tsconfig = JSON.parse(content);
            tsconfig.compilerOptions.baseUrl = baseUrl;

            return JSON.stringify(tsconfig);
          });
        });

        it('uses a provided TypeScript file', async () => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            polyfills: ['src/polyfills.ts'],
          });

          const { result } = await harness.executeOnce();

          expect(result?.success).toBe(true);

          harness.expectFile('dist/browser/polyfills.js').toExist();
        });

        it('uses a provided JavaScript file', async () => {
          await harness.writeFile('src/polyfills.js', `console.log('main');`);

          harness.useTarget('build', {
            ...BASE_OPTIONS,
            polyfills: ['src/polyfills.js'],
          });

          const { result } = await harness.executeOnce();

          expect(result?.success).toBe(true);

          harness.expectFile('dist/browser/polyfills.js').content.toContain(`console.log("main")`);
        });

        it('fails and shows an error when file does not exist', async () => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            polyfills: ['src/missing.ts'],
          });

          const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

          expect(result?.success).toBe(false);
          expect(logs).toContain(
            jasmine.objectContaining({ message: jasmine.stringMatching('Could not resolve') }),
          );

          harness.expectFile('dist/browser/polyfills.js').toNotExist();
        });

        it('resolves module specifiers in array', async () => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            polyfills: ['zone.js', 'zone.js/testing'],
          });

          const { result } = await harness.executeOnce();
          expect(result?.success).toBeTrue();
          harness.expectFile('dist/browser/polyfills.js').toExist();
        });
      });
    }
  });
});
