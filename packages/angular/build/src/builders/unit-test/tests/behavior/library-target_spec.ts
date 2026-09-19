/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, describeBuilder, UNIT_TEST_BUILDER_INFO } from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Behavior: "@angular/build:library buildTarget"', () => {
    it('should support library buildTarget with stylePreprocessorOptions and inlineStyleLanguage', async () => {
      harness.withBuilderTarget(
        'build',
        async () => ({ success: true }),
        {
          tsConfig: 'src/tsconfig.lib.json',
          entryPoints: {
            '.': 'src/public-api.ts',
          },
          inlineStyleLanguage: 'scss',
          stylePreprocessorOptions: {
            includePaths: ['src/styles'],
          },
        },
        {
          builderName: '@angular/build:library',
        },
      );

      await harness.writeFiles({
        'src/styles/_vars.scss': '$primary-color: #123456;',
        'src/public-api.ts': `export * from './lib/lib.component';`,
        'src/lib/lib.component.ts': `
          import { Component } from '@angular/core';

          @Component({
            selector: 'lib-comp',
            standalone: true,
            template: '<p>lib</p>',
            styles: [\`
              @use 'vars';
              p { color: vars.$primary-color; }
            \`],
          })
          export class LibComponent {}
        `,
        'src/lib/lib.component.spec.ts': `
          import { TestBed } from '@angular/core/testing';
          import { describe, it, expect } from 'vitest';
          import { LibComponent } from './lib.component';

          describe('LibComponent', () => {
            it('creates component with scss styles', () => {
              TestBed.configureTestingModule({
                imports: [LibComponent],
              });
              const fixture = TestBed.createComponent(LibComponent);
              expect(fixture).toBeTruthy();
            });
          });
        `,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        include: ['src/lib/**/*.spec.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
