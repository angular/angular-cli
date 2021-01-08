/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "TypeScript Configuration - target"', () => {
    it('downlevels async functions when targetting ES2017', async () => {
      // Set TypeScript configuration target to ES2017 to enable native async
      await harness.modifyFile('src/tsconfig.app.json', (content) => {
        const tsconfig = JSON.parse(content);
        if (!tsconfig.compilerOptions) {
          tsconfig.compilerOptions = {};
        }
        tsconfig.compilerOptions.target = 'es2017';

        return JSON.stringify(tsconfig);
      });

      // Add a JavaScript file with async code
      await harness.writeFile(
        'src/async-test.js',
        'async function testJs() { console.log("from-async-js-function"); }',
      );

      // Add an async function to the project as well as JavaScript file
      await harness.modifyFile(
        'src/main.ts',
        (content) =>
          'import "./async-test";\n' +
          content +
          `\nasync function testApp(): Promise<void> { console.log("from-async-app-function"); }`,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).not.toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Zone.js does not support native async/await in ES2017+'),
        }),
      );

      harness.expectFile('dist/main.js').content.not.toMatch(/\sasync\s/);
      harness.expectFile('dist/main.js').content.toContain('"from-async-app-function"');
      harness.expectFile('dist/main.js').content.toContain('"from-async-js-function"');
    });

    it('downlevels async functions when targetting greater than ES2017', async () => {
      // Set TypeScript configuration target greater than ES2017 to enable native async
      await harness.modifyFile('src/tsconfig.app.json', (content) => {
        const tsconfig = JSON.parse(content);
        if (!tsconfig.compilerOptions) {
          tsconfig.compilerOptions = {};
        }
        tsconfig.compilerOptions.target = 'es2020';

        return JSON.stringify(tsconfig);
      });

      // Add an async function to the project
      await harness.writeFile(
        'src/main.ts',
        'async function test(): Promise<void> { console.log("from-async-function"); }',
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).not.toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Zone.js does not support native async/await in ES2017+'),
        }),
      );

      harness.expectFile('dist/main.js').content.not.toMatch(/\sasync\s/);
      harness.expectFile('dist/main.js').content.toContain('"from-async-function"');
    });
  });
});
