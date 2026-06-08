/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderHarness } from './builder-harness';

export const GOOD_TARGET = './src/good.js';
export const BAD_TARGET = './src/bad.js';

/** Setup project for use of conditional imports. */
export async function setupConditionImport(harness: BuilderHarness<unknown>) {
  // Files that can be used as targets for the conditional import.
  await harness.writeFile('src/good.ts', `export const VALUE = 'good-value';`);
  await harness.writeFile('src/bad.ts', `export const VALUE = 'bad-value';`);
  await harness.writeFile('src/wrong.ts', `export const VALUE = 1;`);

  // Simple application file that accesses conditional code.
  await harness.writeFile(
    'src/main.ts',
    `import {VALUE} from '#target';
console.log(VALUE);
console.log(VALUE.length);
export default 42 as any;
`,
  );

  // Ensure that good/bad can be resolved from tsconfig.
  const tsconfig = JSON.parse(harness.readFile('src/tsconfig.app.json')) as TypeScriptConfig;
  tsconfig.compilerOptions.moduleResolution = 'bundler';
  tsconfig.files.push('good.ts', 'bad.ts', 'wrong.ts');
  await harness.writeFile('src/tsconfig.app.json', JSON.stringify(tsconfig));
}

/** Update package.json with the given mapping for #target. */
export async function setTargetMapping(harness: BuilderHarness<unknown>, mapping: unknown) {
  await harness.writeFile(
    'package.json',
    JSON.stringify({
      name: 'ng-test-app',
      imports: {
        '#target': mapping,
      },
    }),
  );
}

interface TypeScriptConfig {
  compilerOptions: {
    moduleResolution: string;
  };
  files: string[];
}
