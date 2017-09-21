/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, Logger } from '@angular-devkit/core';
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { packages } from '../lib/packages';

const minimatch = require('minimatch');
const npmRun = require('npm-run');
const tar = require('tar');

const gitIgnore = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf-8')
  .split('\n')
  .map(line => line.replace(/#.*/, ''))
  .filter(line => !line.match(/^\s*$/));


function _gitIgnoreMatch(p: string) {
  p = path.relative(path.dirname(__dirname), p);

  return gitIgnore.some(line => minimatch(p, line));
}


function _mkdirp(p: string) {
  // Create parent folder if necessary.
  if (!fs.existsSync(path.dirname(p))) {
    _mkdirp(path.dirname(p));
  }
  fs.mkdirSync(p);
}


function _tar(out: string, dir: string) {
  return tar.create({
    gzip: true,
    strict: true,
    portable: true,
    cwd: dir,
    file: out,
    sync: true,
  }, ['.']);
}


function _copy(from: string, to: string) {
  // Create parent folder if necessary.
  if (!fs.existsSync(path.dirname(to))) {
    _mkdirp(path.dirname(to));
  }

  from = path.relative(process.cwd(), from);
  to = path.relative(process.cwd(), to);

  const buffer = fs.readFileSync(from);
  fs.writeFileSync(to, buffer);
}


function _recursiveCopy(from: string, to: string, logger: Logger) {
  if (!fs.existsSync(from)) {
    logger.error(`File "${from}" does not exist.`);
    process.exit(4);
  }
  if (fs.statSync(from).isDirectory()) {
    fs.readdirSync(from).forEach(fileName => {
      _recursiveCopy(path.join(from, fileName), path.join(to, fileName), logger);
    });
  } else {
    _copy(from, to);
  }
}


function _rm(p: string) {
  p = path.relative(process.cwd(), p);
  fs.unlinkSync(p);
}


function _rimraf(p: string) {
  glob.sync(path.join(p, '**/*'), { dot: true, nodir: true })
    .forEach(p => fs.unlinkSync(p));
  glob.sync(path.join(p, '**/*'), { dot: true })
    .sort((a, b) => b.length - a.length)
    .forEach(p => fs.rmdirSync(p));
}


function _clean(logger: Logger) {
  logger.info('Cleaning...');
  logger.info('  Removing dist/...');
  _rimraf(path.join(__dirname, '../dist'));
}


function _sortPackages() {
  // Order packages in order of dependency.
  // We use bubble sort because we need a full topological sort but adding another dependency
  // or implementing a full topo sort would be too much work and I'm lazy. We don't anticipate
  // any large number of
  const sortedPackages = Object.keys(packages);
  let swapped = false;
  do {
    swapped = false;
    for (let i = 0; i < sortedPackages.length - 1; i++) {
      for (let j = i + 1; j < sortedPackages.length; j++) {
        const a = sortedPackages[i];
        const b = sortedPackages[j];

        if (packages[a].dependencies.indexOf(b) != -1) {
          // Swap them.
          [sortedPackages[i], sortedPackages[i + 1]]
            = [sortedPackages[i + 1], sortedPackages[i]];
          swapped = true;
        }
      }
    }
  } while (swapped);

  return sortedPackages;
}


function _build(logger: Logger) {
  logger.info('Building...');
  const tsConfigPath = path.relative(process.cwd(), path.join(__dirname, '../tsconfig.json'));
  try {
    npmRun.execSync(`tsc -p "${tsConfigPath}"`);
  } catch (err) {
    const stdout = err.stdout.toString().split('\n').join('\n  ');
    logger.error(`TypeScript compiler failed:\n\nSTDOUT:\n  ${stdout}`);
    process.exit(1);
  }
}


export default function(argv: { local?: boolean }, logger: Logger) {
  _clean(logger);

  const sortedPackages = _sortPackages();
  _build(logger);

  logger.info('Moving packages to dist/');
  const packageLogger = new Logger('packages', logger);
  for (const packageName of sortedPackages) {
    packageLogger.info(packageName);
    const pkg = packages[packageName];
    _recursiveCopy(pkg.build, pkg.dist, logger);
    _rimraf(pkg.build);
  }

  logger.info('Copying resources...');
  const resourceLogger = new Logger('resources', logger);
  for (const packageName of sortedPackages) {
    resourceLogger.info(packageName);
    const pkg = packages[packageName];
    const pkgJson = pkg.packageJson;
    const files = glob.sync(path.join(pkg.root, '**/*'), { dot: true, nodir: true });
    const subSubLogger = new Logger(packageName, resourceLogger);
    subSubLogger.info(`${files.length} files total...`);
    const resources = files
      .map((fileName) => path.relative(pkg.root, fileName))
      .filter(fileName => {
        // Schematics template files.
        if (pkgJson['schematics'] &&
         (fileName.match(/(\/|\\)files(\/|\\)/) || fileName.match(/(\/|\\)other-files(\/|\\)/))) {
          return true;
        }

        if (fileName.endsWith('package.json')) {
          return true;
        }

        // Remove Bazel files from NPM.
        if (fileName.endsWith('BUILD')) {
          return false;
        }

        // Skip sources.
        if (fileName.endsWith('.ts') && !fileName.endsWith('.d.ts')) {
          // Verify that it was actually built.
          if (!fs.existsSync(path.join(pkg.dist, fileName).replace(/ts$/, 'js'))) {
            subSubLogger.error(`\nSource found but compiled file not found: "${fileName}".`);
            process.exit(2);
          }

          // Skip all sources.
          return false;
        }

        // Skip tsconfig only.
        if (fileName.endsWith('tsconfig.json')) {
          return false;
        }

        // Skip files from gitignore.
        if (_gitIgnoreMatch(fileName)) {
          return false;
        }

        return true;
      });

    subSubLogger.info(`${resources.length} resources...`);
    resources.forEach(fileName => {
      _copy(path.join(pkg.root, fileName), path.join(pkg.dist, fileName));
    });
  }

  logger.info('Copying extra resources...');
  for (const packageName of sortedPackages) {
    const pkg = packages[packageName];
    _copy(path.join(__dirname, '../LICENSE'), path.join(pkg.dist, 'LICENSE'));
  }

  logger.info('Removing spec files...');
  const specLogger = new Logger('specfiles', logger);
  for (const packageName of sortedPackages) {
    specLogger.info(packageName);
    const pkg = packages[packageName];
    const files = glob.sync(path.join(pkg.dist, '**/*_spec.@(js|d.ts)'));
    specLogger.info(`  ${files.length} spec files found...`);
    files.forEach(fileName => _rm(fileName));
  }

  logger.info('Building ejs templates...');
  const templateLogger = new Logger('templates', logger);
  const templateCompiler = require('@angular-devkit/core').template;
  for (const packageName of sortedPackages) {
    templateLogger.info(packageName);
    const pkg = packages[packageName];
    const files = glob.sync(path.join(pkg.dist, '**/*.ejs'));
    templateLogger.info(`  ${files.length} ejs files found...`);
    files.forEach(fileName => {
      const fn = templateCompiler(fs.readFileSync(fileName).toString());
      _rm(fileName);
      fs.writeFileSync(
        fileName.replace(/\.ejs$/, '.js'),
        fn.source.replace(/^\s*return /, 'module.exports.default = '),
      );
    });
  }

  logger.info('Setting versions...');

  const { versions } = require(path.join(__dirname, '../versions.json'));
  const versionLogger = new Logger('versions', logger);
  for (const packageName of sortedPackages) {
    versionLogger.info(packageName);
    const pkg = packages[packageName];
    const packageJsonPath = path.join(pkg.dist, 'package.json');
    const packageJson = pkg.packageJson;

    if (versions[packageName]) {
      packageJson['version'] = versions[packageName];
    } else {
      versionLogger.fatal('No version found... Only updating dependencies.');
    }

    for (const depName of Object.keys(versions)) {
      const v = versions[depName];
      for (const depKey of ['dependencies', 'peerDependencies', 'devDependencies']) {
        const obj = packageJson[depKey] as JsonObject | null;
        if (obj && obj[depName]) {
          if (argv.local) {
            obj[depName] = packages[depName].tar;
          } else if (obj[depName] == '0.0.0') {
            obj[depName] = v;
          }
        }
      }
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  }

  logger.info('Tarring all packages...');
  const tarLogger = new Logger('license', logger);
  Object.keys(packages).forEach(pkgName => {
    const pkg = packages[pkgName];
    tarLogger.info(`${pkgName} => ${pkg.tar}`);
    _tar(pkg.tar, pkg.dist);
  });

  logger.info(`Done.`);
}
