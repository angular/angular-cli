/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable-next-line:no-implicit-dependencies
import { JsonObject } from '@angular-devkit/core';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const distRoot = path.join(__dirname, '../dist');
const { versions: monorepoVersions, packages: monorepoPackages } = require('../.monorepo.json');


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
  experimental: boolean;
  packageJson: JsonObject;
  dependencies: string[];
  reverseDependencies: string[];

  snapshot: boolean;
  snapshotRepo: string;
  snapshotHash: string;

  version: string;
}
export type PackageMap = { [name: string]: PackageInfo };


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
      case 'optionalDependencies':
      case 'typings':
      case 'version':
      case 'private':
      case 'workspaces':
      case 'resolutions':
      case 'scripts':
        continue;

      // Remove the following keys from the package.json.
      case 'devDependencies':
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

      // Overwrite engines to a common default.
      case 'engines':
        pkg['engines'] = {
          'node': '>= 10.9.0',
          'npm': '>= 6.11.0',
          'pnpm': '>= 3.2.0',
          'yarn': '>= 1.13.0',
        };
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
      } else if (/[\/\\]node_modules[\/\\]/.test(p)) {
        return;
      } else if (fileName == 'package.json') {
        result.push(p);
      } else if (fs.statSync(p).isDirectory() && fileName != 'node_modules') {
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


function _exec(cmd: string) {
  return execSync(cmd).toString().trim();
}


let gitShaCache: string;
function _getSnapshotHash(_pkg: PackageInfo): string {
  if (!gitShaCache) {
    gitShaCache = _exec('git log --format=%h -n1');
  }

  return gitShaCache;
}


let stableVersion = '';
let experimentalVersion = '';
function _getVersionFromGit(experimental: boolean): string {
  if (stableVersion && experimentalVersion) {
    return experimental ? experimentalVersion : stableVersion;
  }

  const hasLocalChanges = _exec(`git status --porcelain`) != '';
  const scmVersionTagRaw = _exec(`git describe --match v[0-9].[0-9].[0-9]* --abbrev=7 --tags`)
    .slice(1);
  stableVersion = scmVersionTagRaw.replace(/-([0-9]+)-g/, '+$1.');
  if (hasLocalChanges) {
    stableVersion += stableVersion.includes('+') ? '.with-local-changes' : '+with-local-changes';
  }

  experimentalVersion = `0.${stableVersion.replace(/^(\d+)\.(\d+)/, (_, major, minor) => {
    return '' + (parseInt(major, 10) * 100 + parseInt(minor, 10));
  })}`;

  return experimental ? experimentalVersion : stableVersion;
}


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
      if (!(name in monorepoPackages)) {
        throw new Error(
          `Package ${name} found in ${JSON.stringify(pkg.root)}, not found in .monorepo.json.`,
        );
      }

      const bin: {[name: string]: string} = {};
      Object.keys(packageJson['bin'] || {}).forEach(binName => {
        let p = path.resolve(pkg.root, packageJson['bin'][binName]);
        if (!fs.existsSync(p)) {
          p = p.replace(/\.js$/, '.ts');
        }
        bin[binName] = p;
      });

      const experimental = !!packageJson.private || !!packageJson.experimental;

      packages[name] = {
        build: path.join(distRoot, pkgRoot.substr(path.dirname(__dirname).length)),
        dist: path.join(distRoot, name),
        root: pkgRoot,
        relative: path.relative(path.dirname(__dirname), pkgRoot),
        main: path.resolve(pkgRoot, 'src/index.ts'),
        private: !!packageJson.private,
        experimental,
        // yarn doesn't take kindly to @ in tgz filenames
        // https://github.com/yarnpkg/yarn/issues/6339
        tar: path.join(distRoot, name.replace(/\/|@/g, '_') + '.tgz'),
        bin,
        name,
        packageJson,

        snapshot: !!monorepoPackages[name].snapshotRepo,
        snapshotRepo: monorepoPackages[name].snapshotRepo,
        get snapshotHash() {
          return _getSnapshotHash(this);
        },

        dependencies: [],
        reverseDependencies: [],
        get version() {
          return _getVersionFromGit(experimental);
        },
      };

      return packages;
    }, {});


// Update with dependencies.
for (const pkgName of Object.keys(packages)) {
  const pkg = packages[pkgName];
  const pkgJson = require(path.join(pkg.root, 'package.json'));
  pkg.dependencies = Object.keys(packages).filter(name => {
    return name in (pkgJson.dependencies || {})
        || name in (pkgJson.devDependencies || {});
  });
  pkg.dependencies.forEach(depName => packages[depName].reverseDependencies.push(pkgName));
}
