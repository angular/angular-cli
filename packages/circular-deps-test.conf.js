/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

const path = require('path');
const fs = require('fs');

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

const LOCAL_MAPPINGS = [
  ['@angular-devkit/build-angular', 'angular_devkit/build_angular'],
  ['@angular-devkit/architect', 'angular_devkit/architect'],
  ['@angular-devkit/architect-cli', 'angular_devkit/architect_cli'],
  ['@angular-devkit/benchmark', 'angular_devkit/benchmark'],
  ['@angular-devkit/build-optimizer', 'angular_devkit/build_optimizer'],
  ['@angular-devkit/build-webpack', 'angular_devkit/build_webpack'],
  ['@angular-devkit/core', 'angular_devkit/core'],
  ['@angular-devkit/schematics', 'angular_devkit/schematics'],
  ['@angular-devkit/schematics-cli', 'angular_devkit/schematics_cli'],
  ['@angular/cli', 'angular/cli'],
  ['@schematics/angular', 'schematics/angular'],
  ['@ngtools/webpack', 'ngtools/webpack'],
];

function resolveModule(specifier) {
  let localSpecifierPath;

  for (const [key, value] of LOCAL_MAPPINGS) {
    if (specifier.startsWith(key)) {
      localSpecifierPath = path.join(__dirname, specifier.replace(key, value));
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
