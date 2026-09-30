/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import fs from 'node:fs';
import path from 'node:path';
import { executeLibraryBuilder } from '../../builder';
import { BASE_OPTIONS, LIBRARY_BUILDER_INFO, describeLibraryBuilder } from '../setup';

describeLibraryBuilder(executeLibraryBuilder, LIBRARY_BUILDER_INFO, (harness) => {
  describe('Behavior: "APF Specification Compliance"', () => {
    it('should conform to Angular Package Format specifications', async () => {
      await harness.writeFiles({
        'projects/lib/README.md': '# Sample APF Library\n',
        'projects/lib/LICENSE': 'MIT License\n',
        'projects/lib/src/theming.scss': '$primary: #1976d2;\n',
        'projects/lib/secondary/src/public-api.ts': 'export const SECONDARY_VALUE = 42;\n',
      });

      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.ts',
          './secondary': './secondary/src/public-api.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          'projects/lib/README.md',
          'projects/lib/LICENSE',
          {
            glob: 'theming.scss',
            input: 'projects/lib/src',
            output: '.',
          },
        ],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // FESM2022 bundles and source maps
      harness.expectFile('dist/lib/fesm2022/lib.mjs').toExist();
      harness.expectFile('dist/lib/fesm2022/lib.mjs.map').toExist();
      harness.expectFile('dist/lib/fesm2022/lib-secondary.mjs').toExist();
      harness.expectFile('dist/lib/fesm2022/lib-secondary.mjs.map').toExist();

      // DTS declarations
      harness.expectFile('dist/lib/types/lib.d.ts').toExist();
      harness.expectFile('dist/lib/types/lib-secondary.d.ts').toExist();

      // Static assets
      harness.expectFile('dist/lib/README.md').toExist();
      harness.expectFile('dist/lib/LICENSE').toExist();
      harness.expectFile('dist/lib/theming.scss').toExist();

      // Root manifest with APF exports map
      harness.expectFile('dist/lib/package.json').toExist();
      const pkg = JSON.parse(harness.readFile('dist/lib/package.json'));
      expect(pkg).toEqual(
        jasmine.objectContaining({
          name: 'lib',
          type: 'module',
          module: './fesm2022/lib.mjs',
          typings: './types/lib.d.ts',
          types: './types/lib.d.ts',
          exports: {
            './package.json': { default: './package.json' },
            '.': {
              types: './types/lib.d.ts',
              default: './fesm2022/lib.mjs',
            },
            './secondary': {
              types: './types/lib-secondary.d.ts',
              default: './fesm2022/lib-secondary.mjs',
            },
          },
        }),
      );

      // Secondary entry point manifest
      harness.expectFile('dist/lib/secondary/package.json').toExist();
      const secondaryPkg = JSON.parse(harness.readFile('dist/lib/secondary/package.json'));
      expect(secondaryPkg).toEqual({
        module: '../fesm2022/lib-secondary.mjs',
        typings: '../types/lib-secondary.d.ts',
        types: '../types/lib-secondary.d.ts',
      });

      // .npmignore
      harness.expectFile('dist/lib/.npmignore').toExist();
      const npmignore = harness.readFile('dist/lib/.npmignore');
      expect(npmignore).toContain('/secondary/package.json');

      // Validate total number of output files (safeguard against emitting unexpected files)
      const distDir = harness.resolvePath('dist/lib');
      const distFiles = fs
        .readdirSync(distDir, { recursive: true })
        .map((f) => String(f))
        .filter((f) => fs.statSync(path.join(distDir, f)).isFile());
      expect(distFiles).toHaveSize(12);
    });
  });
});
