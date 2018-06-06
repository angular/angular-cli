/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule, SchematicsException } from '@angular-devkit/schematics';
import * as semver from 'semver';
import { SchematicsUpdateSchema } from '../schema';
import { updatePackageJson } from '../utility/npm';


const angularDevkitPackagesName = [
  '@angular-devkit/core',
  '@angular-devkit/schematics',
  '@angular-devkit/build-optimizer',
];


export default function(options: SchematicsUpdateSchema): Rule {
  const version = options.version || 'latest';
  if (semver.valid(version)) {
    throw new SchematicsException('You cannot specify a version, you need to use a dist tag.');
  }

  return updatePackageJson(angularDevkitPackagesName, options.version, options.loose);
}
