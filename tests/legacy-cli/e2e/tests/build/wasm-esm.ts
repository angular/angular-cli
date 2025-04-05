/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { ng } from '../../utils/process';
import { prependToFile, replaceInFile } from '../../utils/fs';
import { updateJsonFile, useSha } from '../../utils/project';
import { installWorkspacePackages } from '../../utils/packages';

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

export default async function () {
  // Add WASM file to project
  await writeFile('src/app/multiply.wasm', importWasmBytes);
  await writeFile(
    'src/app/multiply.wasm.d.ts',
    'export declare function multiply(a: number, b: number): number; export declare function subtract1(a: number): number;',
  );

  // Add requested WASM import file
  await writeFile('src/app/values.js', 'export function getValue() { return 100; }');

  // Use WASM file in project
  await prependToFile(
    'src/app/app.ts',
    `
      import { multiply, subtract1 } from './multiply.wasm';
    `,
  );
  await replaceInFile('src/app/app.ts', "'test-project'", 'multiply(4, 5) + subtract1(88)');

  // Remove Zone.js from polyfills and make zoneless
  await updateJsonFile('angular.json', (json) => {
    // Remove bundle budgets to avoid a build error due to the expected increased output size
    // of a JIT production build.
    json.projects['test-project'].architect.build.options.polyfills = [];
  });
  await replaceInFile(
    'src/app/app.config.ts',
    'provideZoneChangeDetection',
    'provideZonelessChangeDetection',
  );
  await replaceInFile(
    'src/app/app.config.ts',
    'provideZoneChangeDetection({ eventCoalescing: true })',
    'provideZonelessChangeDetection()',
  );

  await ng('build');

  // Update E2E test to check for WASM execution
  await writeFile(
    'e2e/src/app.e2e-spec.ts',
    `
    import { AppPage } from './app.po';
    import { browser, logging } from 'protractor';
    describe('WASM execution', () => {
      it('should log WASM result messages', async () => {
        const page = new AppPage();
        await page.navigateTo();
        expect(await page.getTitleText()).toEqual('Hello, 32');
      });
    });
  `,
  );

  await ng('e2e');

  // Setup prerendering and build to test Node.js functionality
  await ng('add', '@angular/ssr', '--skip-confirmation');
  await useSha();
  await installWorkspacePackages();

  await ng('build', '--configuration', 'development', '--prerender');
  const content = await readFile('dist/test-project/browser/index.html', 'utf-8');
  assert.match(content, /Hello, 32/);
}
