/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonAstObject, JsonValue } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { getPackageJsonDependency } from '../../utility/dependencies';
import { findPropertyInAstObject, insertPropertyInAstObjectInOrder, removePropertyInAstObject } from '../../utility/json-utils';
import { readJsonFileAsAstObject } from '../update-9/utils';

const TSLINT_CONFIG_PATH = '/tslint.json';
const RULES_TO_ADD: Record<string, JsonValue> = {
  deprecation: {
    severity: 'warning',
  },
};

export default function (): Rule {
  return (tree, context) => {
    const logger = context.logger;

    // Update tslint dependency
    const current = getPackageJsonDependency(tree, 'tslint');

    if (!current) {
      logger.info('Skipping: "tslint" in not a dependency of this workspace.');

      return;
    }

    // Update tslint config.
    const tslintJsonAst = readJsonFileAsAstObject(tree, TSLINT_CONFIG_PATH);
    if (!tslintJsonAst) {
      const config = ['tslint.js', 'tslint.yaml'].find(c => tree.exists(c));
      if (config) {
        logger.warn(`Skipping: Expected a JSON configuration file but found "${config}".`);
      } else {
        logger.warn('Skipping: Cannot find "tslint.json" configuration file.');
      }

      return;
    }

    for (const [name, value] of Object.entries(RULES_TO_ADD)) {
      const tslintJsonAst = readJsonFileAsAstObject(tree, TSLINT_CONFIG_PATH) as JsonAstObject;
      const rulesAst = findPropertyInAstObject(tslintJsonAst, 'rules');
      if (rulesAst?.kind !== 'object') {
        break;
      }

      if (findPropertyInAstObject(rulesAst, name)) {
        // Skip as rule already exists.
        continue;
      }

      const recorder = tree.beginUpdate(TSLINT_CONFIG_PATH);
      insertPropertyInAstObjectInOrder(recorder, rulesAst, name, value, 4);
      tree.commitUpdate(recorder);
    }
  };
}
