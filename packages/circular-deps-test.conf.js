/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

const fs = require('fs');
const path = require('path');
const { packages } = require('../lib/packages');

module.exports = {
  baseDir: '../',
  goldenFile: '../goldens/circular-deps/packages.json',
  glob: './**/*.ts',
  // Command that will be displayed if the golden needs to be updated.
  approveCommand: 'yarn ts-circular-deps:approve',
  resolveModule: resolveModule,
};

/**
 * Custom module resolver that maps specifiers for local packages folder.
 * This ensures that cross package/entry-point dependencies can be detected.
 */
const LOCAL_MAPPINGS = Object.entries(packages).map(([name, pkg]) => [name, pkg.root]);

function resolveModule(specifier) {
  let localSpecifierPath;

  for (const [key, value] of LOCAL_MAPPINGS) {
    if (specifier.startsWith(key)) {
      localSpecifierPath = specifier.replace(key, value);
      break;
    }
  }

  if (!localSpecifierPath) {
    return null;
  }

  const lookups = [
    localSpecifierPath,
    `${localSpecifierPath}.ts`,
    path.join(localSpecifierPath, 'src/index.ts'),
    path.join(localSpecifierPath, 'index.ts'),
  ];

  for (const lookup of lookups) {
    try {
      if (fs.statSync(lookup).isFile()) {
        return lookup;
      }
    } catch {}
  }

  return null;
}
