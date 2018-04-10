/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// TODO: remove this commented AJV require.
// We don't actually require AJV, but there is a bug with NPM and peer dependencies that is
// whose workaround is to depend on AJV.
// See https://github.com/angular/angular-cli/issues/9691#issuecomment-367322703 for details.
// We need to add a require here to satisfy the dependency checker.
// require('ajv');

export * from './app-shell';
export * from './browser';
export * from './browser/schema';
export * from './dev-server';
export * from './extract-i18n';
export * from './karma';
export * from './karma/schema';
export * from './protractor';
export * from './server';
export * from './tslint';
