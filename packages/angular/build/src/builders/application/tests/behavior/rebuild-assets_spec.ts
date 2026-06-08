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
  describe('Behavior: "Rebuilds when input asset changes"', () => {
    beforeEach(async () => {
      // Application code is not needed for styles tests
      await harness.writeFile('src/main.ts', 'console.log("TEST");');
      await harness.writeFile('public/asset.txt', 'foo');
    });

    it('emits updated asset', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          {
            glob: '**/*',
            input: 'public',
          },
        ],
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          harness.expectFile('dist/browser/asset.txt').content.toContain('foo');

          await harness.writeFile('public/asset.txt', 'bar');
        },
        ({ result }) => {
          expect(result?.success).toBeTrue();
          harness.expectFile('dist/browser/asset.txt').content.toContain('bar');
        },
      ]);
    });

    it('remove deleted asset from output', async () => {
      await Promise.all([
        harness.writeFile('public/asset-two.txt', 'bar'),
        harness.writeFile('public/asset-one.txt', 'foo'),
      ]);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          {
            glob: '**/*',
            input: 'public',
          },
        ],
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          harness.expectFile('dist/browser/asset-one.txt').toExist();
          harness.expectFile('dist/browser/asset-two.txt').toExist();

          await harness.removeFile('public/asset-two.txt');
        },

        ({ result }) => {
          expect(result?.success).toBeTrue();
          harness.expectFile('dist/browser/asset-one.txt').toExist();
          harness.expectFile('dist/browser/asset-two.txt').toNotExist();
        },
      ]);
    });
  });
});
