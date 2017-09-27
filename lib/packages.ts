/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
'use strict';

import { JsonObject } from '@angular-devkit/core';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const glob = require('glob');
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

  hash: string;
}
export type PackageMap = { [name: string]: PackageInfo };


const hashCache: {[name: string]: string | null} = {};
function _getHashOf(pkg: PackageInfo): string {
  if (!(pkg.name in hashCache)) {
    hashCache[pkg.name] = null;
    const md5Stream = crypto.createHash('md5');

    // Update the stream with all files content.
    const files: string[] = glob.sync(path.join(pkg.root, '**'), { nodir: true });
    files.forEach(filePath => {
      md5Stream.write(`\0${filePath}\0`);
      md5Stream.write(fs.readFileSync(filePath));
    });
    // Update the stream with all versions of upstream dependencies.
    pkg.dependencies.forEach(depName => {
      md5Stream.write(`\0${depName}\0${_getHashOf(packages[depName])}\0`);
    });

    md5Stream.end();

    hashCache[pkg.name] = (md5Stream.read() as Buffer).toString('hex');
  }

  const value = hashCache[pkg.name];
  if (!value) {
    // Protect against circular dependency.
    throw new Error('Circular dependency detected between the following packages: '
      + Object.keys(hashCache).filter(key => hashCache[key] == null).join(', '));
  }

  return value;
}


function loadPackageJson(p: string) {
  const root = require('../package.json');
  const pkg = require(p);

  for (const key of Object.keys(root)) {
    switch (key) {
      // Keep the following keys from the package.json of the package itself.
      case 'bin':
      case 'description':
      case 'dependencies':
      case 'name':
      case 'main':
      case 'peerDependencies':
      case 'typings':
      case 'version':
        continue;

      // Remove the following keys from the package.json.
      case 'devDependencies':
      case 'scripts':
        delete pkg[key];
        continue;

      // Merge the following keys with the root package.json.
      case 'keywords':
        const a = pkg[key] || [];
        const b = Object.keys(
          root[key].concat(a).reduce((acc: {[k: string]: boolean}, curr: string) => {
            acc[curr] = true;

            return acc;
          }, {}));
        pkg[key] = b;
        break;

      // Overwrite the package's key with to root one.
      default:
        pkg[key] = root[key];
    }
  }

  return pkg;
}


function _findAllPackageJson(dir: string, exclude: RegExp): string[] {
  const result: string[] = [];
  fs.readdirSync(dir)
    .forEach(fileName => {
      const p = path.join(dir, fileName);

      if (exclude.test(p)) {
        return;
      } else if (fileName == 'package.json') {
        result.push(p);
      } else if (fs.statSync(p).isDirectory()) {
        result.push(..._findAllPackageJson(p, exclude));
      }
    });

  return result;
}


const tsConfigPath = path.join(__dirname, '../tsconfig.json');
const tsConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
const pattern = '^('
  + (tsConfig.config.exclude as string[])
    .map(ex => path.join(path.dirname(tsConfigPath), ex))
    .map(ex => '('
      + ex
        .replace(/[\-\[\]{}()+?./\\^$|]/g, '\\$&')
        .replace(/(\\\\|\\\/)\*\*/g, '((\/|\\\\).+?)?')
        .replace(/\*/g, '[^/\\\\]*')
      + ')')
    .join('|')
  + ')($|/|\\\\)';
const excludeRe = new RegExp(pattern);

// Find all the package.json that aren't excluded from tsconfig.
const packageJsonPaths = _findAllPackageJson(path.join(__dirname, '..'), excludeRe)
  // Remove the root package.json.
  .filter(p => p != path.join(__dirname, '../package.json'));


// All the supported packages. Go through the packages directory and create a map of
// name => PackageInfo. This map is partial as it lacks some information that requires the
// map itself to finish building.
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
        private: packageJson.private,
        tar: path.join(distRoot, name.replace('/', '_') + '.tgz'),
        bin,
        name,
        packageJson,

        dependencies: [],
        hash: '',
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


// Update the hash values of each.
for (const pkgName of Object.keys(packages)) {
  packages[pkgName].hash = _getHashOf(packages[pkgName]);
}
