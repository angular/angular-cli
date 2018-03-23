/**
 * Build configuration for the packaging tool. This file will be automatically detected and used
 * to build the different packages inside of Universal.
 */
const {join} = require('path');

const package = require('./package.json');

/** Current version of the project*/
const buildVersion = package.version;

/**
 * Required Angular version for all Angular Universal packages. This version will be used
 * as the peer dependency version for Angular in all release packages.
 */
const angularVersion = '^5.0.0';

/** License that will be placed inside of all created bundles. */
const buildLicense = `/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */`;

/** The namespace for the packages. Instead of @angular, we use @nguniversal */
const namespace = 'nguniversal';

/** The library entrypoints that are built under the namespace */
const libNames = [
  'aspnetcore-engine',
  'common',
  'express-engine',
  'hapi-engine',
  'module-map-ngfactory-loader',
];

module.exports = {
  projectVersion: buildVersion,
  angularVersion: angularVersion,
  projectDir: __dirname,
  packagesDir: join(__dirname, 'modules'),
  outputDir: join(__dirname, 'dist'),
  licenseBanner: buildLicense,
  namespace,
  libNames
};
