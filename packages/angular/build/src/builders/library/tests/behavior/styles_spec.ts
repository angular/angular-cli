/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeLibraryBuilder } from '../../builder';
import { InlineStyleLanguage } from '../../schema';
import { BASE_OPTIONS, LIBRARY_BUILDER_INFO, describeLibraryBuilder } from '../setup';

describeLibraryBuilder(executeLibraryBuilder, LIBRARY_BUILDER_INFO, (harness) => {
  describe('Behavior: "Stylesheet Preprocessing and Languages"', () => {
    it('should resolve SCSS @use and @import using stylePreprocessorOptions.includePaths', async () => {
      await harness.writeFiles({
        'projects/lib/styles/_variables.scss': '$theme-color: #4caf50;\n',
        'projects/lib/src/lib/lib.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'lib-styled',
          template: '<p>Styled with includePaths</p>',
          styles: [\`
            @use 'variables';
            p {
              color: variables.$theme-color;
            }
          \`],
        })
        export class LibComponent {}
        `,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        inlineStyleLanguage: InlineStyleLanguage.Scss,
        stylePreprocessorOptions: {
          includePaths: ['projects/lib/styles'],
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const fesm = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesm).toMatch(/color:\s*#4caf50/);
    });

    it('should compile component external stylesheet files', async () => {
      await harness.writeFiles({
        'projects/lib/src/lib/lib.component.scss': `
        $bg-color: #2196f3;
        .external-styled {
          background-color: $bg-color;
        }
        `,
        'projects/lib/src/lib/lib.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'lib-external-styled',
          template: '<div class="external-styled">External</div>',
          styleUrl: './lib.component.scss',
        })
        export class LibComponent {}
        `,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const fesm = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesm).toMatch(/background-color:\s*#2196f3/);
    });

    it('should compile component inline Less styles', async () => {
      await harness.writeFile(
        'projects/lib/src/lib/lib.component.ts',
        `
        import { Component } from '@angular/core';

        @Component({
          selector: 'lib-less-styled',
          template: '<span>Less Styled</span>',
          styles: [\`
            @base-color: #9c27b0;
            span {
              color: @base-color;
            }
          \`],
        })
        export class LibComponent {}
        `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        inlineStyleLanguage: InlineStyleLanguage.Less,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const fesm = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesm).toMatch(/color:\s*#9c27b0/);
    });

    it('should inline CSS url assets as data URIs', async () => {
      await harness.writeFiles({
        'projects/lib/src/lib/test.svg':
          '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>',
        'projects/lib/src/lib/lib.component.css': `
        .icon {
          background-image: url('./test.svg');
        }
        `,
        'projects/lib/src/lib/lib.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'lib-icon',
          template: '<div class="icon"></div>',
          styleUrl: './lib.component.css',
        })
        export class LibComponent {}
        `,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const fesm = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesm).toContain('data:image/svg+xml');
    });
  });
});
