/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
'use strict';

import { JsonObject } from '@angular-devkit/core';
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import * as ts from 'typescript';

const distRoot = path.join(__dirname, '../dist');


export interface PackageInfo {
  name: string;
  root: string;
  bin: { [name: string]: string};
  relative: string;
  main: string;
  dist: string;
  build: string;
  tar: string;
  private: boolean;
  packageJson: JsonObject;
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
        const b = Object.keys(
          root[key].concat(a).reduce((acc: {[k: string]: boolean}, curr: string) => {
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


const tsConfigPath = path.join(__dirname, '../tsconfig.json');
const tsConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
// tslint:disable-next-line:no-any
const pattern = (ts as any).getRegularExpressionForWildcard(
    tsConfig.config.exclude, path.dirname(tsConfigPath), 'exclude');
const excludeRe = new RegExp(pattern);

// Remove all files from tsconfig, and our own package.json.
const packageJsonPaths = glob.sync(path.join(__dirname, '../*/**/package.json'))
  .filter(p => !excludeRe.test(p));

// All the supported packages. Go through the packages directory and create a _map of
// name => fullPath.
export const packages: PackageMap =
  packageJsonPaths
    .map(pkgPath => ({ root: path.dirname(pkgPath) }))
    .reduce((packages: PackageMap, pkg) => {
      const pkgRoot = pkg.root;
      const packageJson = loadPackageJson(path.join(pkgRoot, 'package.json'));
      const name = packageJson['name'];
      if (!name) {
        // Only build the entry if there's a package name.
        return packages;
      }
      const bin: {[name: string]: string} = {};
      Object.keys(packageJson['bin'] || {}).forEach(binName => {
        let p = path.resolve(pkg.root, packageJson['bin'][binName]);
        if (!fs.existsSync(p)) {
          p = p.replace(/\.js$/, '.ts');
        }
        bin[binName] = p;
      });

      packages[name] = {
        build: path.join(distRoot, pkgRoot.substr(path.dirname(__dirname).length)),
        dist: path.join(distRoot, name),
        root: pkgRoot,
        relative: path.relative(path.dirname(__dirname), pkgRoot),
        main: path.resolve(pkgRoot, 'src/index.ts'),
        dependencies: [],
        private: packageJson.private,
        tar: path.join(distRoot, name.replace('/', '_') + '.tgz'),
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
