/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { format } from 'prettier';
import { transformJasmineToVitest } from './test-file-transformer';
import { RefactorReporter } from './utils/refactor-reporter';

/**
 * A test helper to run the Jasmine to Vitest transformer on a given code
 * snippet and compare it to an expected output.
 *
 * This function automatically handles the setup of a `RefactorReporter` and
 * formats both the transformed and expected code using Prettier. This ensures
 * that test comparisons are consistent and not affected by minor formatting
 * differences.
 *
 * @param input The Jasmine code snippet to be transformed.
 * @param expected The expected Vitest code snippet after transformation.
 */
export async function expectTransformation(
  input: string,
  expected: string,
  addImports = false,
): Promise<void> {
  const logger = new logging.NullLogger();
  const reporter = new RefactorReporter(logger);
  const transformed = transformJasmineToVitest('spec.ts', input, reporter, {
    addImports,
    browserMode: false,
  });
  const formattedTransformed = await format(transformed, { parser: 'typescript' });
  const formattedExpected = await format(expected, { parser: 'typescript' });

  expect(formattedTransformed).toBe(formattedExpected);
}
