/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { JsonObject, logging } from '@angular-devkit/core';
import * as path from 'path';
import { packages } from '../lib/packages';

require('../lib/bootstrap-local');

const spdxSatisfies = require('spdx-satisfies');


/**
 * A general note on some black listed specific licenses:
 * - CC0
 *    This is not a valid license. It does not grant copyright of the code/asset, and does not
 *    resolve patents or other licensed work. The different claims also have no standing in court
 *    and do not provide protection to or from Google and/or third parties.
 *    We cannot use nor contribute to CC0 licenses.
 * - Public Domain
 *    Same as CC0, it is not a valid license.
 */
const licensesWhitelist = [
  // Regular valid open source licenses supported by Google.
  'MIT',
  'ISC',
  'Apache-2.0',

  'BSD-2-Clause',
  'BSD-3-Clause',
  'BSD-4-Clause',

  // All CC-BY licenses have a full copyright grant and attribution section.
  'CC-BY-3.0',
  'CC-BY-4.0',

  // Have a full copyright grant. Validated by opensource team.
  'Unlicense',

  // Combinations.
  '(AFL-2.1 OR BSD-2-Clause)',
];

// Name variations of SPDX licenses that some packages have.
// Licenses not included in SPDX but accepted will be converted to MIT.
const licenseReplacements: { [key: string]: string } = {
  // Just a longer string that our script catches. SPDX official name is the shorter one.
  'Apache License, Version 2.0': 'Apache-2.0',
  'Apache2': 'Apache-2.0',
  'Apache 2.0': 'Apache-2.0',
  'Apache v2': 'Apache-2.0',
  'AFLv2.1': 'AFL-2.1',
  // BSD is BSD-2-clause by default.
  'BSD': 'BSD-2-Clause',
};

// Specific packages to ignore, add a reason in a comment. Format: package-name@version.
const ignoredPackages = [
  // Us.
  '@angular/devkit-repo@0.0.0',  // Hey, that's us!
  // * Development only
  'spdx-license-ids@3.0.1',  // CC0 but it's content only (index.json, no code) and not distributed.
  'tslint-sonarts@1.9.0', // LGPL-3.0 but only used as a tool, not linked in the build.

  // * Broken license fields
  'bitsyntax@0.0.4', // MIT but no license field in package.json
  'pako@1.0.6', // MIT but broken license in package.json
  'true-case-path@1.0.2', // Apache-2.0 but broken license in package.json
  'uws@9.14.0', // zlib license

  // * Need to publish these with LICENSE files
  // see https://github.com/bazelbuild/rules_nodejs/pull/696
  // TODO(alexeagle): remove these after a release that fixes it
  '@bazel/bazel@0.24.1',
  '@bazel/bazel-linux_x64@0.24.1',
  '@bazel/buildifier@0.22.0',
  '@bazel/buildifier-linux_x64@0.22.0',
  '@bazel/jasmine@0.26.0',

  // * Other
  'font-awesome@4.7.0', // (OFL-1.1 AND MIT)
  'stream-json@0.5.2', // 'New BSD'
];

// Ignore own packages (all MIT)
for (const packageName of Object.keys(packages)) {
  ignoredPackages.push(`${packageName}@0.0.0`);
}

// Find all folders directly under a `node_modules` that have a package.json.
const checker = require('license-checker');


// Check if a license is accepted by an array of accepted licenses
function _passesSpdx(licenses: string[], accepted: string[]) {
  try {
    return spdxSatisfies(licenses.join(' AND '), accepted.join(' OR '));
  } catch {
    return false;
  }
}


export default function (_options: {}, logger: logging.Logger): Promise<number> {
  return new Promise(resolve => {
    checker.init({ start: path.join(__dirname, '..') }, (err: Error, json: JsonObject) => {
      if (err) {
        logger.fatal(`Something happened:\n${err.message}`);
        resolve(1);
      } else {
        logger.info(`Testing ${Object.keys(json).length} packages.\n`);

        // Packages with bad licenses are those that neither pass SPDX nor are ignored.
        const badLicensePackages = Object.keys(json)
          .map(key => ({
            id: key,
            licenses: ([] as string[])
              .concat((json[key] as JsonObject).licenses as string[])
              // `*` is used when the license is guessed.
              .map(x => x.replace(/\*$/, ''))
              .map(x => x in licenseReplacements ? licenseReplacements[x] : x),
          }))
          .filter(pkg => !_passesSpdx(pkg.licenses, licensesWhitelist))
          .filter(pkg => !ignoredPackages.find(ignored => ignored === pkg.id));

        // Report packages with bad licenses
        if (badLicensePackages.length > 0) {
          logger.error('Invalid package licences found:');
          badLicensePackages.forEach(pkg => {
            logger.error(`${pkg.id}: ${JSON.stringify(pkg.licenses)}`);
          });
          logger.fatal(`\n${badLicensePackages.length} total packages with invalid licenses.`);
          resolve(2);
        } else {
          logger.info('All package licenses are valid.');
          resolve(0);
        }
      }
    });
  });
}
