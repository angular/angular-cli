/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { strings } from '@angular-devkit/core';
import {
  Rule,
  apply,
  applyTemplates,
  mergeWith,
  move,
  partitionApplyMerge,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { Schema } from './schema';

export default function (options: Schema): Rule {
  const schematicsVersion = require('@angular-devkit/schematics/package.json').version;
  const coreVersion = require('@angular-devkit/core/package.json').version;

  return (_, context) => {
    context.addTask(
      new NodePackageInstallTask({
        workingDirectory: options.name,
        packageManager: options.packageManager,
      }),
    );

    return mergeWith(
      apply(url('./files'), [
        // The `package.json` name is kept to allow renovate to update the dependency versions
        move('package.json', 'package.json.template'),
        partitionApplyMerge(
          (p) => !/\/src\/.*?\/files\//.test(p),
          applyTemplates({
            ...options,
            coreVersion,
            schematicsVersion,
            dot: '.',
            dasherize: strings.dasherize,
          }),
        ),
        move(options.name),
      ]),
    );
  };
}
