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
  describe('Behavior: "Secondary Entry Points and Intra-Dependencies"', () => {
    it('should build secondary entry points with intra-dependencies in topological order', async () => {
      await harness.writeFiles({
        'projects/lib/shared/src/public-api.ts': `
        import { Injectable } from '@angular/core';

        @Injectable({ providedIn: 'root' })
        export class SharedService {
          getValue(): string {
            return 'shared-value';
          }
        }
        `,
        'projects/lib/feature-a/src/public-api.ts': `
        import { Component, inject } from '@angular/core';
        import { SharedService } from 'lib/shared';

        @Component({
          selector: 'feature-a',
          template: '<p>Feature A: {{ shared.getValue() }}</p>',
        })
        export class FeatureAComponent {
          protected readonly shared = inject(SharedService);
        }
        `,
        'projects/lib/feature-b/src/public-api.ts': `
        import { Component, inject } from '@angular/core';
        import { SharedService } from 'lib/shared';
        import { FeatureAComponent } from 'lib/feature-a';

        @Component({
          selector: 'feature-b',
          imports: [FeatureAComponent],
          template: '<feature-a /><p>Feature B: {{ shared.getValue() }}</p>',
        })
        export class FeatureBComponent {
          protected readonly shared = inject(SharedService);
        }
        `,
        'projects/lib/sub-module/src/public-api.ts': `export const SUB_MODULE_CONSTANT = 'sub-module';\n`,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        entryPoints: {
          '.': 'projects/lib/src/public-api.ts',
          'shared': 'projects/lib/shared/src/public-api.ts',
          'feature-a': 'projects/lib/feature-a/src/public-api.ts',
          'feature-b': 'projects/lib/feature-b/src/public-api.ts',
          'sub-module': 'projects/lib/sub-module/src/public-api.ts',
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Check all FESM2022 bundles exist
      harness.expectFile('dist/lib/fesm2022/lib.mjs').toExist();
      harness.expectFile('dist/lib/fesm2022/lib-shared.mjs').toExist();
      harness.expectFile('dist/lib/fesm2022/lib-feature-a.mjs').toExist();
      harness.expectFile('dist/lib/fesm2022/lib-feature-b.mjs').toExist();
      harness.expectFile('dist/lib/fesm2022/lib-sub-module.mjs').toExist();

      // Check all DTS declarations exist
      harness.expectFile('dist/lib/types/lib.d.ts').toExist();
      harness.expectFile('dist/lib/types/lib-shared.d.ts').toExist();
      harness.expectFile('dist/lib/types/lib-feature-a.d.ts').toExist();
      harness.expectFile('dist/lib/types/lib-feature-b.d.ts').toExist();
      harness.expectFile('dist/lib/types/lib-sub-module.d.ts').toExist();

      // Check secondary package.json manifests
      harness.expectFile('dist/lib/shared/package.json').toExist();
      harness.expectFile('dist/lib/feature-a/package.json').toExist();
      harness.expectFile('dist/lib/feature-b/package.json').toExist();
      harness.expectFile('dist/lib/sub-module/package.json').toExist();

      // Verify root export maps
      const rootPkg = JSON.parse(harness.readFile('dist/lib/package.json'));
      expect(rootPkg.exports).toEqual(
        jasmine.objectContaining({
          './shared': {
            types: './types/lib-shared.d.ts',
            default: './fesm2022/lib-shared.mjs',
          },
          './feature-a': {
            types: './types/lib-feature-a.d.ts',
            default: './fesm2022/lib-feature-a.mjs',
          },
          './feature-b': {
            types: './types/lib-feature-b.d.ts',
            default: './fesm2022/lib-feature-b.mjs',
          },
          './sub-module': {
            types: './types/lib-sub-module.d.ts',
            default: './fesm2022/lib-sub-module.mjs',
          },
        }),
      );

      // Verify .npmignore contains all secondary dirs
      const npmignore = harness.readFile('dist/lib/.npmignore');
      expect(npmignore).toContain('/shared/package.json');
      expect(npmignore).toContain('/feature-a/package.json');
      expect(npmignore).toContain('/feature-b/package.json');
      expect(npmignore).toContain('/sub-module/package.json');
    });

    it('should throw an error when a circular dependency exists between secondary entry points', async () => {
      await harness.writeFiles({
        'projects/lib/ep-one/src/public-api.ts': `
        import { EpTwoService } from 'lib/ep-two';
        export const VAL_ONE = 'one';
        `,
        'projects/lib/ep-two/src/public-api.ts': `
        import { VAL_ONE } from 'lib/ep-one';
        export class EpTwoService {}
        `,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        entryPoints: {
          '.': 'projects/lib/src/public-api.ts',
          'ep-one': 'projects/lib/ep-one/src/public-api.ts',
          'ep-two': 'projects/lib/ep-two/src/public-api.ts',
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
      expect(result?.error).toContain('Circular dependency detected');
    });
  });
});
