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
        polyfills: ['zone.js'],
        sourceMap: {
          scripts: true,
        },
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.not.toMatch(/\sasync\s+function\s/);
      harness.expectFile('dist/browser/main.js.map').content.toContain('Promise<Void123>');
    });

    it('downlevels async functions when zone.js is included as a polyfill', async () => {
      // Add an async function to the project
      await harness.writeFile(
        'src/main.ts',
        'async function test(): Promise<void> { console.log("from-async-function"); }\ntest();',
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        polyfills: ['zone.js'],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.not.toMatch(/\sasync\s/);
      harness.expectFile('dist/browser/main.js').content.toContain('"from-async-function"');
    });

    it('does not downlevels async functions when zone.js is not included as a polyfill', async () => {
      // Add an async function to the project
      await harness.writeFile(
        'src/main.ts',
        'async function test(): Promise<void> { console.log("from-async-function"); }\ntest();',
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        polyfills: [],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toMatch(/\sasync\s/);
      harness.expectFile('dist/browser/main.js').content.toContain('"from-async-function"');
    });

    it('warns when IE is present in browserslist', async () => {
      await harness.writeFile(
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
          message: jasmine.stringContaining('ES5 output is not supported'),
        }),
      );

      // Don't duplicate the error.
      expect(logs).not.toContain(
        jasmine.objectContaining({
          message: jasmine.stringContaining("fall outside Angular's browser support"),
        }),
      );
    });

    it("warns when targeting a browser outside Angular's minimum support", async () => {
      await harness.writeFile('.browserslistrc', 'Chrome >= 100');

      harness.useTarget('build', BASE_OPTIONS);

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      expect(logs).toContain(
        jasmine.objectContaining({
          level: 'warn',
          message: jasmine.stringContaining("fall outside Angular's browser support"),
        }),
      );
    });

    it('downlevels "for await...of" when zone.js is included as a polyfill', async () => {
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
        polyfills: ['zone.js'],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.not.toMatch(/\sawait\s/);
      harness.expectFile('dist/browser/main.js').content.toContain('"for await...of"');
    });

    it('does not downlevel "for await...of" when zone.js is not included as a polyfill', async () => {
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
        polyfills: [],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.toMatch(/\sawait\s/);
      harness.expectFile('dist/browser/main.js').content.toContain('"for await...of"');
    });
  });
});
