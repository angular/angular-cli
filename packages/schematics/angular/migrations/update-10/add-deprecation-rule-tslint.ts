/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonValue } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { getPackageJsonDependency } from '../../utility/dependencies';
import { JSONFile } from '../../utility/json-file';

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
    let json;
    try {
      json = new JSONFile(tree, TSLINT_CONFIG_PATH);
    } catch {
      const config = ['tslint.js', 'tslint.yaml'].find((c) => tree.exists(c));
      if (config) {
        logger.warn(`Expected a JSON configuration file but found "${config}".`);
      } else {
        logger.warn('Cannot find "tslint.json" configuration file.');
      }

      return;
    }

    for (const [name, value] of Object.entries(RULES_TO_ADD)) {
      const ruleName = ['rules', name];
      if (json.get(ruleName) === undefined) {
        json.modify(ruleName, value);
      }
    }
  };
}
