/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, harness => {
  describe('Option: "allowedCommonJsDependencies"', () => {
    describe('given option is not set', () => {
      for (const aot of [true, false]) {
        it(`should not show warning for styles import in ${aot ? 'AOT' : 'JIT'} Mode`, async () => {
          await harness.writeFile('./test.css', `body { color: red; };`);
          await harness.appendToFile('src/app/app.component.ts', `import '../../test.css';`);

          harness.useTarget('build', {
            ...BASE_OPTIONS,
            allowedCommonJsDependencies: [],
            aot,
          });

          const { result, logs } = await harness.executeOnce();

          expect(result?.success).toBe(true);
          expect(logs).not.toContain(
            jasmine.objectContaining<logging.LogEntry>({
              message: jasmine.stringMatching(/CommonJS or AMD dependencies/),
            }),
          );
        });

        it(`should show warning when depending on a Common JS bundle in ${aot ? 'AOT' : 'JIT'} Mode`, async () => {
          // Add a Common JS dependency
          await harness.appendToFile('src/app/app.component.ts', `import 'bootstrap';`);

          harness.useTarget('build', {
            ...BASE_OPTIONS,
            allowedCommonJsDependencies: [],
            aot,
          });

          const { result, logs } = await harness.executeOnce();

          expect(result?.success).toBe(true);
          expect(logs).toContain(
            jasmine.objectContaining<logging.LogEntry>({
              message: jasmine.stringMatching(/Warning: .+app\.component\.ts depends on 'bootstrap'\. CommonJS or AMD dependencies/),
            }),
          );
          expect(logs).not.toContain(
            jasmine.objectContaining<logging.LogEntry>({ message: jasmine.stringMatching('jquery') }),
            'Should not warn on transitive CommonJS packages which parent is also CommonJS.',
          );
        });
      }
    });

    it('should not show warning when depending on a Common JS bundle which is allowed', async () => {
      // Add a Common JS dependency
      await harness.appendToFile('src/app/app.component.ts', `
        import 'bootstrap';
        import 'zone.js/dist/zone-error';
      `);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        allowedCommonJsDependencies: [
          'bootstrap',
          'zone.js',
        ],
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(/CommonJS or AMD dependencies/),
        }),
      );
    });

    it(`should not show warning when importing non global local data '@angular/common/locale/fr'`, async () => {
      await harness.appendToFile('src/app/app.component.ts', `import '@angular/common/locales/fr';`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        allowedCommonJsDependencies: [],
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(/CommonJS or AMD dependencies/),
        }),
      );
    });

    it('should not show warning in JIT for templateUrl and styleUrl when using paths', async () => {
      await harness.modifyFile(
        'tsconfig.json', content => {
          return content.replace(/"baseUrl": ".\/",/, `
            "baseUrl": "./",
            "paths": {
              "@app/*": [
                "src/app/*"
              ]
            },
          `);
        });

      await harness.modifyFile(
        'src/app/app.module.ts',
        content => content.replace('./app.component', '@app/app.component'),
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        allowedCommonJsDependencies: [],
        aot: false,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(/CommonJS or AMD dependencies/),
        }),
      );
    });
  });
});
