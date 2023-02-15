/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildEsbuildBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildEsbuildBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "TypeScript Path Mapping"', () => {
    it('should resolve TS files when imported with a path mapping', async () => {
      // Change main module import to use path mapping
      await harness.modifyFile('src/main.ts', (content) =>
        content.replace(`'./app/app.module'`, `'@root/app.module'`),
      );

      // Add a path mapping for `@root`
      await harness.modifyFile('tsconfig.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions.paths = {
          '@root/*': ['./src/app/*'],
        };

        return JSON.stringify(tsconfig);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
    });

    it('should fail to resolve if no path mapping for an import is present', async () => {
      // Change main module import to use path mapping
      await harness.modifyFile('src/main.ts', (content) =>
        content.replace(`'./app/app.module'`, `'@root/app.module'`),
      );

      // Add a path mapping for `@not-root`
      await harness.modifyFile('tsconfig.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions.paths = {
          '@not-root/*': ['./src/app/*'],
        };

        return JSON.stringify(tsconfig);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

      expect(result?.success).toBe(false);
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Could not resolve "@root/app.module"'),
        }),
      );
    });

    it('should resolve JS files when imported with a path mapping', async () => {
      // Change main module import to use path mapping
      await harness.modifyFile('src/main.ts', (content) =>
        content.replace(`'./app/app.module'`, `'app-module'`),
      );

      await harness.writeFiles({
        'a.js': `export * from './src/app/app.module';\n\nconsole.log('A');`,
        'a.d.ts': `export * from './src/app/app.module';`,
      });

      // Add a path mapping for `@root`
      await harness.modifyFile('tsconfig.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions.paths = {
          'app-module': ['a.js'],
        };

        return JSON.stringify(tsconfig);
      });

      // app.module needs to be manually included since it is not referenced via a TS file
      // with the test path mapping in place.
      await harness.modifyFile('src/tsconfig.app.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.files.push('app/app.module.ts');

        return JSON.stringify(tsconfig);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js').content.toContain(`console.log("A")`);
    });
  });
});
