/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeLibraryBuilder } from '../../builder';
import { BASE_OPTIONS, LIBRARY_BUILDER_INFO, describeLibraryBuilder } from '../setup';

describeLibraryBuilder(executeLibraryBuilder, LIBRARY_BUILDER_INFO, (harness) => {
  describe('Behavior: "Core Angular Features, Dynamic Imports, and Modern TS"', () => {
    it('should compile standalone components with signal inputs, outputs, and pipes', async () => {
      await harness.writeFiles({
        'projects/lib/src/lib/custom.pipe.ts': `
        import { Pipe, PipeTransform } from '@angular/core';

        @Pipe({
          name: 'customUpper',
          standalone: true,
        })
        export class CustomPipe implements PipeTransform {
          transform(value: string): string {
            return value.toUpperCase();
          }
        }
        `,
        'projects/lib/src/lib/lib.component.ts': `
        import { Component, input, output, signal } from '@angular/core';
        import { CustomPipe } from './custom.pipe';

        @Component({
          selector: 'lib-core-features',
          imports: [CustomPipe],
          template: '<p>{{ title() | customUpper }}</p>',
        })
        export class LibComponent {
          readonly title = input<string>('default-title');
          readonly statusChange = output<boolean>();
          readonly count = signal<number>(0);
        }
        `,
        'projects/lib/src/public-api.ts': `
        export * from './lib/custom.pipe';
        export * from './lib/lib.component';
        `,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const fesm = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesm).toContain('CustomPipe');
      expect(fesm).toContain('customUpper');
      expect(fesm).toContain('LibComponent');
      expect(fesm).toContain('title');

      const dts = harness.readFile('dist/lib/types/lib.d.ts');
      expect(dts).toContain('CustomPipe');
      expect(dts).toContain('LibComponent');
    });

    it('should support dynamic imports in library code', async () => {
      await harness.writeFiles({
        'projects/lib/src/lib/lazy-module.ts': `
        export const LAZY_MESSAGE = 'lazy-loaded message';
        export function computeLazyValue(a: number, b: number): number {
          return a + b;
        }
        `,
        'projects/lib/src/lib/lib.service.ts': `
        import { Injectable } from '@angular/core';

        @Injectable({ providedIn: 'root' })
        export class LibService {
          async loadLazy(): Promise<string> {
            const { LAZY_MESSAGE } = await import('./lazy-module');
            return LAZY_MESSAGE;
          }
        }
        `,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const fesm = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesm).toContain('loadLazy');
      expect(fesm).toContain('LibService');
    });
  });
});
