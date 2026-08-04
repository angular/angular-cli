/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "extractLicenses"', () => {
    it(`should generate '3rdpartylicenses.txt' when 'extractLicenses' is true`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        extractLicenses: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/3rdpartylicenses.txt').content.toContain('MIT');
    });

    it(`should not generate '3rdpartylicenses.txt' when 'extractLicenses' is false`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        extractLicenses: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/3rdpartylicenses.txt').toNotExist();
    });

    it(`should generate '3rdpartylicenses.txt' when 'extractLicenses' is not set`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/3rdpartylicenses.txt').content.toContain('MIT');
    });

    it(`should generate '3rdpartylicenses.txt' when 'extractLicenses' and 'localize' are true`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        localize: true,
        extractLicenses: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/3rdpartylicenses.txt').content.toContain('MIT');
      harness.expectFile('dist/browser/en-US/main.js').toExist();
    });

    it(`should extract license from a package with a lowercase 'license' file`, async () => {
      await harness.writeFile(
        'node_modules/test-package-a/package.json',
        JSON.stringify({
          name: 'test-package-a',
          version: '1.0.0',
          main: 'index.js',
          license: 'MIT',
        }),
      );
      await harness.writeFile(
        'node_modules/test-package-a/index.js',
        'console.log("test-package-a");',
      );
      await harness.writeFile('node_modules/test-package-a/license', 'TEST_LOWERCASE_LICENSE_TEXT');
      await harness.appendToFile('src/main.ts', "\nimport 'test-package-a';\n");

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        extractLicenses: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness
        .expectFile('dist/3rdpartylicenses.txt')
        .content.toContain('TEST_LOWERCASE_LICENSE_TEXT');
    });

    it(`should extract license from a package with an alternative license file name (e.g., 'MIT-LICENCE.txt')`, async () => {
      await harness.writeFile(
        'node_modules/test-package-b/package.json',
        JSON.stringify({
          name: 'test-package-b',
          version: '1.0.0',
          main: 'index.js',
          license: 'MIT',
        }),
      );
      await harness.writeFile(
        'node_modules/test-package-b/index.js',
        'console.log("test-package-b");',
      );
      await harness.writeFile(
        'node_modules/test-package-b/MIT-LICENCE.txt',
        'TEST_ALTERNATIVE_LICENSE_TEXT',
      );
      await harness.appendToFile('src/main.ts', "\nimport 'test-package-b';\n");

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        extractLicenses: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness
        .expectFile('dist/3rdpartylicenses.txt')
        .content.toContain('TEST_ALTERNATIVE_LICENSE_TEXT');
    });

    it(`should extract license from a package with a custom license file specified in package.json`, async () => {
      await harness.writeFile(
        'node_modules/test-package-c/package.json',
        JSON.stringify({
          name: 'test-package-c',
          version: '1.0.0',
          main: 'index.js',
          license: 'SEE LICENSE IN custom-license.md',
        }),
      );
      await harness.writeFile(
        'node_modules/test-package-c/index.js',
        'console.log("test-package-c");',
      );
      await harness.writeFile(
        'node_modules/test-package-c/custom-license.md',
        'TEST_CUSTOM_LICENSE_TEXT',
      );
      await harness.appendToFile('src/main.ts', "\nimport 'test-package-c';\n");

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        extractLicenses: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/3rdpartylicenses.txt').content.toContain('TEST_CUSTOM_LICENSE_TEXT');
    });
  });
});
