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


const angularPackagesName = [
  '@angular/animations',
  '@angular/bazel',
  '@angular/benchpress',
  '@angular/common',
  '@angular/compiler',
  '@angular/compiler-cli',
  '@angular/core',
  '@angular/forms',
  '@angular/http',
  '@angular/language-service',
  '@angular/platform-browser',
  '@angular/platform-browser-dynamic',
  '@angular/platform-server',
  '@angular/platform-webworker',
  '@angular/platform-webworker-dynamic',
  '@angular/router',
  '@angular/service-worker',
  '@angular/upgrade',
];

export default function(options: SchematicsUpdateSchema): Rule {
  const version = options.version || 'latest';
  if (semver.valid(version)) {
    if (!semver.gt(version, '4.0.0')) {
      throw new SchematicsException('You cannot use a version of Angular older than 4.');
    }
  }

  return updatePackageJson(angularPackagesName, options.version, options.loose);
}
