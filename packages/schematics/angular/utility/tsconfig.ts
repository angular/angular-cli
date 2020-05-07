/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonParseMode, parseJsonAst } from '@angular-devkit/core';
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { appendValueInAstArray, findPropertyInAstObject } from './json-utils';

const SOLUTION_TSCONFIG_PATH = 'tsconfig.json';

/**
 * Add project references in "Solution Style" tsconfig.
 */
export function addTsConfigProjectReferences(paths: string[]): Rule {
  return (host, context) => {
    const logger = context.logger;

    // We need to read after each write to avoid missing `,` when appending multiple items.
    for (const path of paths) {
      const source = host.read(SOLUTION_TSCONFIG_PATH);
      if (!source) {
        // Solution tsconfig doesn't exist.
        logger.warn(`Cannot add reference '${path}' in '${SOLUTION_TSCONFIG_PATH}'. File doesn't exists.`);

        return;
      }

      const jsonAst = parseJsonAst(source.toString(), JsonParseMode.Loose);
      if (jsonAst?.kind !== 'object') {
        // Invalid JSON
        throw new SchematicsException(`Invalid JSON AST Object '${SOLUTION_TSCONFIG_PATH}'.`);
      }

      // Solutions style tsconfig can contain 2 properties:
      //  - 'files' with a value of empty array
      //  - 'references'
      const filesAst = findPropertyInAstObject(jsonAst, 'files');
      const referencesAst = findPropertyInAstObject(jsonAst, 'references');
      if (
        filesAst?.kind !== 'array' ||
        filesAst.elements.length !== 0 ||
        referencesAst?.kind !== 'array'
      ) {
        logger.warn(`Cannot add reference '${path}' in '${SOLUTION_TSCONFIG_PATH}'. It appears to be an invalid solution style tsconfig.`);

        return;
      }

      // Append new paths
      const recorder = host.beginUpdate(SOLUTION_TSCONFIG_PATH);
      appendValueInAstArray(recorder, referencesAst, { 'path': `./${path}` }, 4);
      host.commitUpdate(recorder);
    }
  };
}

/**
 * Throws an exception when the base tsconfig doesn't exists.
 */
export function verifyBaseTsConfigExists(host: Tree): void {
  if (host.exists('tsconfig.base.json')) {
    return;
  }

  throw new SchematicsException(`Cannot find base TypeScript configuration file 'tsconfig.base.json'.`);
}
