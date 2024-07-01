/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

/**
 * Compiled and base64 encoded WASM file for the following WAT:
 * ```
 *  (module
 *    (export "multiply" (func $multiply))
 *    (func $multiply (param i32 i32) (result i32)
 *      local.get 0
 *      local.get 1
 *      i32.mul
 *    )
 *  )
 * ```
 */
const exportWasmBase64 =
  'AGFzbQEAAAABBwFgAn9/AX8DAgEABwwBCG11bHRpcGx5AAAKCQEHACAAIAFsCwAXBG5hbWUBCwEACG11bHRpcGx5AgMBAAA=';
const exportWasmBytes = Buffer.from(exportWasmBase64, 'base64');

/**
 * Compiled and base64 encoded WASM file for the following WAT:
 * ```
 * (module
 *  (import "./values" "getValue" (func $getvalue (result i32)))
 *  (export "multiply" (func $multiply))
 *  (export "subtract1" (func $subtract))
 *  (func $multiply (param i32 i32) (result i32)
 *    local.get 0
 *    local.get 1
 *    i32.mul
 *  )
 *  (func $subtract (param i32) (result i32)
 *    call $getvalue
 *    local.get 0
 *    i32.sub
 *  )
 * )
 * ```
 */
const importWasmBase64 =
  'AGFzbQEAAAABEANgAAF/YAJ/fwF/YAF/AX8CFQEILi92YWx1ZXMIZ2V0VmFsdWUAAAMDAgECBxgCCG11bHRpcGx5AAEJc3VidHJhY3QxAAIKEQIHACAAIAFsCwcAEAAgAGsLAC8EbmFtZQEfAwAIZ2V0dmFsdWUBCG11bHRpcGx5AghzdWJ0cmFjdAIHAwAAAQACAA==';
const importWasmBytes = Buffer.from(importWasmBase64, 'base64');

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Supports WASM/ES module integration"', () => {
    it('should inject initialization code and add an export', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      // Create WASM file
      await harness.writeFile('src/multiply.wasm', exportWasmBytes);

      // Create main file that uses the WASM file
      await harness.writeFile(
        'src/main.ts',
        `
          // @ts-ignore
          import { multiply } from './multiply.wasm';

          console.log(multiply(4, 5));
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Ensure initialization code and export name is present in output code
      harness.expectFile('dist/browser/main.js').content.toContain('WebAssembly.instantiate');
      harness.expectFile('dist/browser/main.js').content.toContain('multiply');
    });

    it('should compile successfully with a provided type definition file', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      // Create WASM file
      await harness.writeFile('src/multiply.wasm', exportWasmBytes);
      await harness.writeFile(
        'src/multiply.wasm.d.ts',
        'export declare function multiply(a: number, b: number): number;',
      );

      // Create main file that uses the WASM file
      await harness.writeFile(
        'src/main.ts',
        `
          import { multiply } from './multiply.wasm';

          console.log(multiply(4, 5));
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Ensure initialization code and export name is present in output code
      harness.expectFile('dist/browser/main.js').content.toContain('WebAssembly.instantiate');
      harness.expectFile('dist/browser/main.js').content.toContain('multiply');
    });

    it('should add WASM defined imports and include resolved TS file for import', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      // Create WASM file
      await harness.writeFile('src/subtract.wasm', importWasmBytes);

      // Create TS file that is expect by WASM file
      await harness.writeFile(
        'src/values.ts',
        `
         export function getValue(): number { return 100; }
      `,
      );
      // The file is not imported into any actual TS files so it needs to be manually added to the TypeScript program
      await harness.modifyFile('src/tsconfig.app.json', (content) =>
        content.replace('"main.ts",', '"main.ts","values.ts",'),
      );

      // Create main file that uses the WASM file
      await harness.writeFile(
        'src/main.ts',
        `
          // @ts-ignore
          import { subtract1 } from './subtract.wasm';

          console.log(subtract1(5));
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Ensure initialization code and export name is present in output code
      harness.expectFile('dist/browser/main.js').content.toContain('WebAssembly.instantiate');
      harness.expectFile('dist/browser/main.js').content.toContain('subtract1');
      harness.expectFile('dist/browser/main.js').content.toContain('./values');
      harness.expectFile('dist/browser/main.js').content.toContain('getValue');
    });

    it('should add WASM defined imports and include resolved JS file for import', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      // Create WASM file
      await harness.writeFile('src/subtract.wasm', importWasmBytes);

      // Create JS file that is expect by WASM file
      await harness.writeFile(
        'src/values.js',
        `
         export function getValue() { return 100; }
      `,
      );

      // Create main file that uses the WASM file
      await harness.writeFile(
        'src/main.ts',
        `
          // @ts-ignore
          import { subtract1 } from './subtract.wasm';

          console.log(subtract1(5));
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Ensure initialization code and export name is present in output code
      harness.expectFile('dist/browser/main.js').content.toContain('WebAssembly.instantiate');
      harness.expectFile('dist/browser/main.js').content.toContain('subtract1');
      harness.expectFile('dist/browser/main.js').content.toContain('./values');
      harness.expectFile('dist/browser/main.js').content.toContain('getValue');
    });

    it('should inline WASM files less than 10kb', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      // Create WASM file
      await harness.writeFile('src/multiply.wasm', exportWasmBytes);

      // Create main file that uses the WASM file
      await harness.writeFile(
        'src/main.ts',
        `
          // @ts-ignore
          import { multiply } from './multiply.wasm';

          console.log(multiply(4, 5));
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Ensure WASM is present in output code
      harness.expectFile('dist/browser/main.js').content.toContain(exportWasmBase64);
    });

    it('should show an error on invalid WASM file', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      // Create WASM file
      await harness.writeFile('src/multiply.wasm', 'NOT_WASM');

      // Create main file that uses the WASM file
      await harness.writeFile(
        'src/main.ts',
        `
          // @ts-ignore
          import { multiply } from './multiply.wasm';

          console.log(multiply(4, 5));
      `,
      );

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Unable to analyze WASM file'),
        }),
      );
    });

    it('should show an error if using Zone.js', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        polyfills: ['zone.js'],
      });

      // Create WASM file
      await harness.writeFile('src/multiply.wasm', importWasmBytes);

      // Create main file that uses the WASM file
      await harness.writeFile(
        'src/main.ts',
        `
          // @ts-ignore
          import { multiply } from './multiply.wasm';

          console.log(multiply(4, 5));
      `,
      );

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(
            'WASM/ES module integration imports are not supported with Zone.js applications',
          ),
        }),
      );
    });
  });
});
