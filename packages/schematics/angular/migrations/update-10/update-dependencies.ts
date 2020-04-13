/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule } from '@angular-devkit/schematics';
import {
  addPackageJsonDependency,
  getPackageJsonDependency,
} from '../../utility/dependencies';
import { latestVersions } from '../../utility/latest-versions';

export default function (): Rule {
  return (host, context) => {
    const dependenciesToUpdate: Record<string, string> = {
      'karma': '~5.0.0',
      'ng-packagr': latestVersions.ngPackagr,
    };

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
    }

    // Check for @angular-devkit/schematics and @angular-devkit/core
    for (const name of ['@angular-devkit/schematics', '@angular-devkit/core']) {
      const current = getPackageJsonDependency(host, name);
      if (current) {
        context.logger.info(
          `Package "${name}" found in the workspace package.json. ` +
            'This package typically does not need to be installed manually. ' +
            'If it is not being used by project code, it can be removed from the package.json.',
        );
      }
    }
  };
}
