/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "Browser support"', () => {
    it('creates correct sourcemaps when downleveling async functions', async () => {
      // Add a JavaScript file with async code
      await harness.writeFile(
        'src/async-test.js',
        'async function testJs() { console.log("from-async-js-function"); }',
      );

      // Add an async function to the project as well as JavaScript file
      // The type `Void123` is used as a unique identifier for the final sourcemap
      // If sourcemaps are not properly propagated then it will not be in the final sourcemap
      await harness.modifyFile(
        'src/main.ts',
        (content) =>
          'import "./async-test";\n' +
          content +
          '\ntype Void123 = void;' +
          `\nasync function testApp(): Promise<Void123> { console.log("from-async-app-function"); }`,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        vendorChunk: true,
        sourceMap: {
          scripts: true,
        },
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js').content.not.toMatch(/\sasync\s/);
      harness.expectFile('dist/main.js.map').content.toContain('Promise<Void123>');
    });

    it('downlevels async functions ', async () => {
      // Add an async function to the project
      await harness.writeFile(
        'src/main.ts',
        'async function test(): Promise<void> { console.log("from-async-function"); }',
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        vendorChunk: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js').content.not.toMatch(/\sasync\s/);
      harness.expectFile('dist/main.js').content.toContain('"from-async-function"');
    });

    it('warns when IE is present in browserslist', async () => {
      await harness.appendToFile(
        '.browserslistrc',
        `
           IE 9
           IE 11
         `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      expect(logs).toContain(
        jasmine.objectContaining({
          level: 'warn',
          message:
            `One or more browsers which are configured in the project's Browserslist ` +
            'configuration will be ignored as ES5 output is not supported by the Angular CLI.\n' +
            'Ignored browsers: ie 11, ie 9',
        }),
      );
    });

    it('downlevels "for await...of"', async () => {
      // Add an async function to the project
      await harness.writeFile(
        'src/main.ts',
        `
          (async () => {
            for await (const o of [1, 2, 3]) {
              console.log("for await...of");
            }
          })();
          `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        vendorChunk: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js').content.not.toMatch(/\sawait\s/);
      harness.expectFile('dist/main.js').content.toContain('"for await...of"');
    });
  });
});
