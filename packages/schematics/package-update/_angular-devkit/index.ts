/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule } from '@angular-devkit/schematics';
import { SchematicsUpdateSchema } from '../schema';
import { updatePackageJson } from '../utility/npm';


const angularPackagesName = [
  '@angular-devkit/core',
  '@angular-devkit/schematics',
  '@angular-devkit/build-optimizer',
];


export default function(options: SchematicsUpdateSchema): Rule {
  return updatePackageJson(angularPackagesName, options.version, options.loose);
}
