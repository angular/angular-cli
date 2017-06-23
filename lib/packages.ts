/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
'use strict';

import * as glob from 'glob';
import * as path from 'path';

const packageRoot = path.join(__dirname, '../packages');
const distRoot = path.join(__dirname, '../dist');
const versions = require('../versions.json');


export interface PackageInfo {
  name: string;
  root: string;
  bin: { [name: string]: string};
  relative: string;
  main: string;
  dist: string;
  build: string;
  packageJson: any;
  dependencies: string[];
}
export type PackageMap = { [name: string]: PackageInfo };


function loadPackageJson(p: string) {
  const root = require('../package.json');
  const pkg = require(p);

  for (const key of Object.keys(root)) {
    switch (key) {
      case 'bin':
      case 'description':
      case 'dependencies':
      case 'devDependencies':
      case 'name':
      case 'main':
      case 'peerDependencies':
      case 'scripts':
      case 'typings':
      case 'version':
        continue;

      case 'keywords':
        const a = pkg[key] || [];
        const b = Object.keys(root[key].concat(a).reduce((acc: any, curr: string) => {
          acc[curr] = true;
          return acc;
        }, {}));
        pkg[key] = b;
        break;

      default:
        pkg[key] = root[key];
    }
  }
  return pkg;
}


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
      const packageJson = loadPackageJson(path.join(pkgRoot, 'package.json'));
      const name = packageJson['name'];
      const bin: {[name: string]: string} = {};
      Object.keys(packageJson['bin'] || {}).forEach(binName => {
        bin[binName] = path.resolve(pkg.root, packageJson['bin'][binName]);
      });

      if (!(name in versions)) {
        console.error(`ERROR: package ${name} does not have a version.`);
        process.exit(101);
      }

      packages[name] = {
        build: path.join(distRoot, pkgRoot.substr(path.dirname(__dirname).length)),
        dist: path.join(distRoot, name),
        root: pkgRoot,
        relative: path.relative(path.dirname(__dirname), pkgRoot),
        main: path.resolve(pkgRoot, 'src/index.ts'),
        dependencies: [],
        bin,
        name,
        packageJson,
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
