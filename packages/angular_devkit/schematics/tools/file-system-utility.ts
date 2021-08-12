/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonValue } from '@angular-devkit/core';
import { FileDoesNotExistException } from '@angular-devkit/schematics';
import { existsSync, readFileSync } from 'fs';
import { ParseError, parse, printParseErrorCode } from 'jsonc-parser';

export function readJsonFile(path: string): JsonValue {
  if (!existsSync(path)) {
    throw new FileDoesNotExistException(path);
  }

  const errors: ParseError[] = [];
  const content = parse(readFileSync(path, 'utf-8'), errors, { allowTrailingComma: true });

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
