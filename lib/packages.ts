/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
'use strict';

import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';

const packageRoot = path.join(__dirname, '../packages');
const distRoot = path.join(__dirname, '../dist');


export interface PackageInfo {
  name: string;
  root: string;
  bin: { [name: string]: string};
  relative: string;
  main: string;
  dist: string;
  tsConfig?: string;
  packageJson: string;
  dependencies: string[];
}
export type PackageMap = { [name: string]: PackageInfo };


const packageJsonPaths =
  glob.sync(path.join(packageRoot, '**/package.json'))
    // Removing all files from templates.
    .filter(p => !p.match(/\/angular.*files\//));


// All the supported packages. Go through the packages directory and create a _map of
// name => fullPath.
export const packages: PackageMap =
  packageJsonPaths
    .map(pkgPath => [pkgPath, path.relative(packageRoot, path.dirname(pkgPath))])
    .map(([pkgPath, pkgName]) => {
      return { name: pkgName, root: path.dirname(pkgPath) };
    })
    .reduce((packages: PackageMap, pkg) => {
      const pkgRoot = pkg.root;
      let pkgJson = require(path.join(pkgRoot, 'package.json'));
      let name = pkgJson['name'];
      let bin: {[name: string]: string} = {};
      Object.keys(pkgJson['bin'] || {}).forEach(binName => {
        bin[binName] = path.resolve(pkg.root, pkgJson['bin'][binName]);
      });

      let tsConfig: string | undefined = path.resolve(pkgRoot, 'tsconfig.json');
      if (!fs.existsSync(tsConfig)) {
        tsConfig = undefined;
      }

      packages[name] = {
        dist: path.join(distRoot, name),
        packageJson: path.join(pkgRoot, 'package.json'),
        root: pkgRoot,
        relative: path.relative(path.dirname(__dirname), pkgRoot),
        main: path.resolve(pkgRoot, 'src/index.ts'),
        bin,
        tsConfig,
        name,
        dependencies: []
      };
      return packages;
    }, {});


// Update with dependencies.
for (const pkgName of Object.keys(packages)) {
  const pkg = packages[pkgName];
  const pkgJson = require(path.join(pkg.root, 'package.json'));
  pkg.dependencies = Object.keys(packages).filter(name => {
    return name in (pkgJson.dependencies || {})
        || name in (pkgJson.devDependencies || {})
        || name in (pkgJson.peerDependencies || {});
  });
}
