/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { JsonValue } from '@angular-devkit/core';
import { readFileSync } from 'fs';
import { ParseError, parse, printParseErrorCode } from 'jsonc-parser';
import { FileDoesNotExistException } from '../src/exception/exception';

export function readJsonFile(path: string): JsonValue {
  let data;
  try {
    data = readFileSync(path, 'utf-8');
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT') {
      throw new FileDoesNotExistException(path);
    }
    throw e;
  }

  const errors: ParseError[] = [];
  const content = parse(data, errors, { allowTrailingComma: true }) as JsonValue;

  if (errors.length) {
    const { error, offset } = errors[0];
    throw new Error(
      `Failed to parse "${path}" as JSON AST Object. ${printParseErrorCode(
        error,
      )} at location: ${offset}.`,
    );
  }

  return content;
}
