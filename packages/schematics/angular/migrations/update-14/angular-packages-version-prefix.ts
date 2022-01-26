/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { NodeDependencyType } from '../../utility/dependencies';
import { JSONFile } from '../../utility/json-file';

const PACKAGES_REGEXP = /^@(?:angular|nguniversal|schematics|angular-devkit)\/|^ng-packagr$/;

/**
 * This migrations updates Angular packages 'dependencies' and 'devDependencies' version prefix to '^' instead of '~'.
 *
 * @example
 * **Before**
 * ```json
 * dependencies: {
 *   "@angular/animations": "~13.1.0",
 *   "@angular/common": "~13.1.0"
 * }
 * ```
 *
 * **After**
 * ```json
 * dependencies: {
 *   "@angular/animations": "^13.1.0",
 *   "@angular/common": "^13.1.0"
 * }
 * ```
 */
export default function (): Rule {
  return (tree, context) => {
    const json = new JSONFile(tree, '/package.json');
    updateVersionPrefixToTilde(json, NodeDependencyType.Default);
    updateVersionPrefixToTilde(json, NodeDependencyType.Dev);

    context.addTask(new NodePackageInstallTask());
  };
}

function updateVersionPrefixToTilde(json: JSONFile, dependencyType: NodeDependencyType): void {
  const dependencyTypePath = [dependencyType];
  const dependencies = json.get(dependencyTypePath);

  if (!dependencies || typeof dependencies !== 'object') {
    return;
  }

  const updatedDependencies = new Map<string, string>();
  for (const [name, version] of Object.entries(dependencies)) {
    if (typeof version === 'string' && version.charAt(0) === '~' && PACKAGES_REGEXP.test(name)) {
      updatedDependencies.set(name, `^${version.substring(1)}`);
    }
  }

  if (updatedDependencies.size) {
    json.modify(dependencyTypePath, {
      ...dependencies,
      ...Object.fromEntries(updatedDependencies),
    });
  }
}
