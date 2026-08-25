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
  describe('Behavior: "Vitest barrel sideEffects"', () => {
    // Regression test for https://github.com/angular/angular-cli/issues/33910.
    it('should retain barrel-exported components when package.json has sideEffects: false', async () => {
      harness.withBuilderTarget(
        'build',
        async () => ({ success: true }),
        {
          project: 'src/lib/ng-package.json',
        },
        {
          builderName: '@angular/build:ng-packagr',
        },
      );

      await harness.modifyFile('tsconfig.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions ??= {};
        tsconfig.compilerOptions.paths = {
          '@lib': ['./src/lib/public-api.ts'],
          '@lib/sub': ['./src/lib/sub/public-api.ts'],
        };

        return JSON.stringify(tsconfig);
      });

      await harness.writeFiles({
        'src/lib/package.json': JSON.stringify({
          name: '@lib',
          version: '0.0.1',
          sideEffects: false,
        }),
        'src/lib/ng-package.json': JSON.stringify({
          lib: {
            entryFile: 'public-api.ts',
          },
        }),
        'src/lib/public-api.ts': `
          export * from './components/public-api-components';
          export * from './other/other.component';
        `,
        'src/lib/components/public-api-components.ts': `export * from './foo/foo.component';`,
        'src/lib/components/foo/foo.component.ts': `
          import { Component } from '@angular/core';

          @Component({
            selector: 'lib-foo',
            standalone: true,
            template: '<p>foo</p>',
          })
          export class FooComponent {}
        `,
        'src/lib/other/other.component.ts': `
          import { Component } from '@angular/core';

          @Component({
            selector: 'lib-other',
            standalone: true,
            template: '<p>other</p>',
          })
          export class OtherComponent {}
        `,
        'src/lib/other/other.component.spec.ts': `
          import { TestBed } from '@angular/core/testing';
          import { describe, it, expect } from 'vitest';
          import { OtherComponent } from '@lib';

          describe('OtherComponent', () => {
            it('creates', () => {
              TestBed.configureTestingModule({
                imports: [OtherComponent],
              });
              const fixture = TestBed.createComponent(OtherComponent);
              expect(fixture).toBeTruthy();
            });
          });
        `,
        'src/lib/sub/ng-package.json': JSON.stringify({
          lib: {
            entryFile: 'public-api.ts',
          },
        }),
        'src/lib/sub/public-api.ts': `export * from './bar/bar.component';`,
        'src/lib/sub/bar/bar.component.ts': `
          import { Component } from '@angular/core';
          import { FooComponent } from '@lib';

          @Component({
            selector: 'lib-bar',
            standalone: true,
            imports: [FooComponent],
            template: '<lib-foo></lib-foo>',
          })
          export class BarComponent {}
        `,
        'src/lib/sub/bar/bar.component.spec.ts': `
          import { TestBed } from '@angular/core/testing';
          import { describe, it, expect } from 'vitest';
          import { BarComponent } from './bar.component';

          describe('BarComponent', () => {
            it('creates', () => {
              TestBed.configureTestingModule({
                imports: [BarComponent],
              });
              const fixture = TestBed.createComponent(BarComponent);
              expect(fixture).toBeTruthy();
            });
          });
        `,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        include: ['lib/**/*.spec.ts'],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
    });
  });
});
