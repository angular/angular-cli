/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';
import { BuilderMode } from '../../schema';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget) => {
  describe('Option: "aot"', () => {
    it('enables aot with application builder', async () => {
      await setupTarget(harness);

      await harness.writeFiles({
        'src/aot.spec.ts': `
          import { Component } from '@angular/core';

          describe('Hello', () => {
            it('should *not* contain jit instructions', () => {
              @Component({
                template: 'Hello',
              })
              class Hello {}

              expect((Hello as any).ɵcmp.template.toString()).not.toContain('jit');
            });
          });
`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        aot: true,
        /** Cf. {@link ../builder-mode_spec.ts} */
        polyfills: ['zone.js', '@angular/localize/init', 'zone.js/testing'],
        builderMode: BuilderMode.Application,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('enables aot with browser builder', async () => {
      await setupTarget(harness);

      await harness.writeFiles({
        'src/aot.spec.ts': `
          import { Component } from '@angular/core';

          describe('Hello', () => {
            it('should *not* contain jit instructions', () => {
              @Component({
                template: 'Hello',
              })
              class Hello {}

              expect((Hello as any).ɵcmp.template.toString()).not.toContain('jit');
            });
          });
`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        aot: true,
        /** Cf. {@link ../builder-mode_spec.ts} */
        polyfills: ['zone.js', '@angular/localize/init', 'zone.js/testing'],
        builderMode: BuilderMode.Browser,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
