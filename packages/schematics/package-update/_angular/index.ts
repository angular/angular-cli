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
  '@angular/animations/browser',
  '@angular/animations/browser/testing',
  '@angular/animations',
  '@angular/bazel',
  '@angular/benchpress',
  '@angular/common/http',
  '@angular/common/http/testing',
  '@angular/common',
  '@angular/common/testing',
  '@angular/compiler',
  '@angular/compiler/testing',
  '@angular/compiler-cli',
  '@angular/core',
  '@angular/core/testing',
  '@angular/forms',
  '@angular/http',
  '@angular/http/testing',
  '@angular/language-service',
  '@angular/platform-browser/animations',
  '@angular/platform-browser',
  '@angular/platform-browser/testing',
  '@angular/platform-browser-dynamic',
  '@angular/platform-browser-dynamic/testing',
  '@angular/platform-server',
  '@angular/platform-server/testing',
  '@angular/platform-webworker',
  '@angular/platform-webworker-dynamic',
  '@angular/router',
  '@angular/router/testing',
  '@angular/router/upgrade',
  '@angular/service-worker/config',
  '@angular/service-worker',
  '@angular/upgrade',
  '@angular/upgrade/static',
];

export default function(options: SchematicsUpdateSchema): Rule {
  return updatePackageJson(angularPackagesName, options.version, options.loose);
}
