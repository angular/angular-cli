/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "allowedCommonJsDependencies"', () => {
    describe('given option is not set', () => {
      for (const aot of [true, false]) {
        it(`should show warning when depending on a Common JS bundle in ${
          aot ? 'AOT' : 'JIT'
        } Mode`, async () => {
          // Add a Common JS dependency
          await harness.appendToFile('src/app/app.component.ts', `import 'buffer';`);

          harness.useTarget('build', {
            ...BASE_OPTIONS,
            allowedCommonJsDependencies: [],
            optimization: true,
            aot,
          });

          const { result, logs } = await harness.executeOnce();

          expect(result?.success).toBe(true);
          expect(logs).toContain(
            jasmine.objectContaining<logging.LogEntry>({
              message: jasmine.stringMatching(
                /Module 'buffer' used by 'src\/app\/app\.component\.ts' is not ESM/,
              ),
            }),
          );
          expect(logs).toContain(
            jasmine.objectContaining<logging.LogEntry>({
              message: jasmine.stringMatching(/CommonJS or AMD dependencies/),
            }),
          );
          expect(logs).not.toContain(
            jasmine.objectContaining<logging.LogEntry>({
              message: jasmine.stringMatching('base64-js'),
            }),
            'Should not warn on transitive CommonJS packages which parent is also CommonJS.',
          );
        });
      }
    });

    it('should not show warning when depending on a Common JS bundle which is allowed', async () => {
      // Add a Common JS dependency
      await harness.appendToFile(
        'src/app/app.component.ts',
        `
        import 'buffer';
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        allowedCommonJsDependencies: ['buffer', 'base64-js', 'ieee754'],
        optimization: true,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(/CommonJS or AMD dependencies/),
        }),
      );
    });

    it('should not show warning when all dependencies are allowed by wildcard', async () => {
      // Add a Common JS dependency
      await harness.appendToFile(
        'src/app/app.component.ts',
        `
        import 'buffer';
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        allowedCommonJsDependencies: ['*'],
        optimization: true,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(/CommonJS or AMD dependencies/),
        }),
      );
    });

    it('should not show warning when depending on zone.js', async () => {
      // Add a Common JS dependency
      await harness.appendToFile(
        'src/app/app.component.ts',
        `
        import 'zone.js';
      `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        allowedCommonJsDependencies: [],
        optimization: true,
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
      await harness.appendToFile(
        'src/app/app.component.ts',
        `import '@angular/common/locales/fr';`,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        allowedCommonJsDependencies: [],
        optimization: true,
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
      await harness.modifyFile('tsconfig.json', (content) => {
        return content.replace(
          /"baseUrl": ".\/",/,
          `
            "baseUrl": "./",
            "paths": {
              "@app/*": [
                "src/app/*"
              ]
            },
          `,
        );
      });

      await harness.modifyFile('src/app/app.module.ts', (content) =>
        content.replace('./app.component', '@app/app.component'),
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        allowedCommonJsDependencies: [],
        optimization: true,
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

    it('should not show warning for relative imports', async () => {
      await harness.appendToFile('src/main.ts', `import './abc';`);
      await harness.writeFile('src/abc.ts', 'console.log("abc");');

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        allowedCommonJsDependencies: [],
        optimization: true,
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
