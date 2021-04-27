/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  addPackageJsonDependency,
  getPackageJsonDependency,
} from '../../utility/dependencies';
import { latestVersions } from '../../utility/latest-versions';

export default function (): Rule {
  return (host, context) => {
    const dependenciesToUpdate: Record<string, string> = {
      '@types/jasmine': '~3.6.0',
      'codelyzer': '^6.0.0',
      'jasmine-core': '~3.6.0',
      'jasmine-spec-reporter': '~5.0.0',
      'karma-chrome-launcher': '~3.1.0',
      'karma-coverage': '~2.0.3',
      'karma-jasmine': '~4.0.0',
      'karma-jasmine-html-reporter': '^1.5.0',
      'tslib': '^2.0.0',
    };

    let hasChanges = false;
    for (const [name, version] of Object.entries(dependenciesToUpdate)) {
      const current = getPackageJsonDependency(host, name);
      if (!current || current.version === version) {
        continue;
      }

      addPackageJsonDependency(host, {
        type: current.type,
        name,
        version,
        overwrite: true,
      });

      hasChanges = true;
    }

    if (hasChanges) {
      context.addTask(new NodePackageInstallTask());
    }
  };
}
