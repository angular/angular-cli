/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { JsonObject, logging } from '@angular-devkit/core';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { packages } from '../lib/packages';
import buildSchema from './build-schema';

const minimatch = require('minimatch');
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
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p);
  }
}

function _recursiveFileList(p: string): string[] {
  if (!fs.statSync(p).isDirectory()) {
    return [];
  }

  const list = fs.readdirSync(p);

  return list
    .map(subpath => {
      const subpathList = _recursiveFileList(path.join(p, subpath));

      return [ subpath, ...subpathList.map(sp => path.join(subpath, sp))];
    })
    // Flatten.
    .reduce((acc, curr) => [...acc, ...curr], [])
    // Filter out directories.
    .filter(sp => !fs.statSync(path.join(p, sp)).isDirectory());
}


// This method mimics how npm pack tars packages.
function _tar(out: string, dir: string) {
  // NOTE: node-tar does some Magic Stuff depending on prefixes for files
  //       specifically with @ signs, so we just neutralize that one
  //       and any such future "features" by prepending `./`

  // Without this, the .tar file cannot be opened on Windows.

  const files = _recursiveFileList(dir).map((f) => `./${f}`);

  return tar.create({
    gzip: true,
    strict: true,
    portable: true,
    cwd: dir,
    prefix: 'package/',
    file: out,
    sync: true,
    // Provide a specific date in the 1980s for the benefit of zip,
    // which is confounded by files dated at the Unix epoch 0.
    mtime: new Date('1985-10-26T08:15:00.000Z'),
  }, files);
}


function _copy(from: string, to: string) {
  // Create parent folder if necessary.
  if (!fs.existsSync(path.dirname(to))) {
    _mkdirp(path.dirname(to));
  }

  // Error out if destination already exists.
  if (fs.existsSync(to)) {
    throw new Error(`Path ${to} already exist...`);
  }

  from = path.relative(process.cwd(), from);
  to = path.relative(process.cwd(), to);

  const buffer = fs.readFileSync(from);
  fs.writeFileSync(to, buffer);
}


function _recursiveCopy(from: string, to: string, logger: logging.Logger) {
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


function _clean(logger: logging.Logger) {
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

function _exec(command: string, args: string[], opts: { cwd?: string }, logger: logging.Logger) {
  const { status, error, stderr, stdout } = child_process.spawnSync(command, args, {
    stdio: 'inherit',
    ...opts,
  });

  if (status != 0) {
    logger.error(`Command failed: ${command} ${args.map(x => JSON.stringify(x)).join(', ')}`);
    if (error) {
      logger.error('Error: ' + (error ? error.message : 'undefined'));
    } else {
      logger.error(`STDOUT:\n${stdout}`);
      logger.error(`STDERR:\n${stderr}`);
    }
    throw error;
  }
}


function _build(logger: logging.Logger) {
  logger.info('Building...');
  _exec('node', [
    require.resolve('typescript/bin/tsc'),
    '-p',
    'tsconfig.json',
  ], {}, logger);
}


async function _bazel(logger: logging.Logger) {
  // TODO: undo this when we fully support bazel on windows.
  // logger.info('Bazel build...');
  // _exec('bazel', ['build', '//packages/...'], {}, logger);
}

// tslint:disable-next-line:no-big-function
export default async function(
  argv: { local?: boolean, snapshot?: boolean },
  logger: logging.Logger,
) {
  _clean(logger);

  const sortedPackages = _sortPackages();
  await _bazel(logger);
  await buildSchema({}, logger);
  _build(logger);

  logger.info('Moving packages to dist/');
  const packageLogger = logger.createChild('packages');
  for (const packageName of sortedPackages) {
    packageLogger.info(packageName);
    const pkg = packages[packageName];
    _recursiveCopy(pkg.build, pkg.dist, logger);
    _rimraf(pkg.build);
  }

  logger.info('Merging bazel-bin/ with dist/');
  for (const packageName of sortedPackages) {
    const pkg = packages[packageName];
    const bazelBinPath = pkg.build.replace(/([\\\/]dist[\\\/])(packages)/, (_, dist, packages) => {
      return path.join(dist, 'dist-schema', packages);
    });
    if (fs.existsSync(bazelBinPath)) {
      packageLogger.info(packageName);
      _recursiveCopy(bazelBinPath, pkg.dist, logger);
      _rimraf(bazelBinPath);
    }
  }

  logger.info('Copying resources...');
  const resourceLogger = logger.createChild('resources');
  for (const packageName of sortedPackages) {
    resourceLogger.info(packageName);
    const pkg = packages[packageName];
    const pkgJson = pkg.packageJson;
    const files = glob.sync(path.join(pkg.root, '**/*'), { dot: true, nodir: true });
    const subSubLogger = resourceLogger.createChild(packageName);
    subSubLogger.info(`${files.length} files total...`);
    const resources = files
      .map((fileName) => path.relative(pkg.root, fileName))
      .filter(fileName => {
        if (/(?:^|[\/\\])node_modules[\/\\]/.test(fileName)) {
          return false;
        }

        // Schematics template files.
        if (pkgJson['schematics'] &&
         (fileName.match(/(\/|\\)files(\/|\\)/) || fileName.match(/(\/|\\)\w+-files(\/|\\)/))) {
          return true;
        }

        if (fileName.endsWith('package.json')) {
          return true;
        }

        // Remove Bazel files from NPM.
        if (fileName === 'BUILD' || fileName === 'BUILD.bazel') {
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
  const specLogger = logger.createChild('specfiles');
  for (const packageName of sortedPackages) {
    const pkg = packages[packageName];
    const files = glob.sync(path.join(pkg.dist, '**/*_spec?(_large).@(js|d.ts)'));

    if (files.length == 0) {
      continue;
    }

    specLogger.info(packageName);
    specLogger.info(`  ${files.length} spec files found...`);
    files.forEach(fileName => _rm(fileName));
  }

  logger.info('Building ejs templates...');
  const templateLogger = logger.createChild('templates');
  const templateCompiler = require('@angular-devkit/core').template;
  for (const packageName of sortedPackages) {
    const pkg = packages[packageName];
    const files = glob.sync(path.join(pkg.dist, '**/*.ejs'));

    if (files.length == 0) {
      continue;
    }

    templateLogger.info(packageName);
    templateLogger.info(`  ${files.length} ejs files found...`);
    files.forEach(fileName => {
      const p = path.relative(
        path.dirname(__dirname),
        path.join(pkg.root, path.relative(pkg.dist, fileName)),
      );
      const fn = templateCompiler(fs.readFileSync(fileName).toString(), {
        module: true,
        sourceURL: p,
        sourceMap: true,
        sourceRoot: path.join(__dirname, '..'),
        fileName: fileName.replace(/\.ejs$/, '.js'),
      });
      _rm(fileName);
      fs.writeFileSync(fileName.replace(/\.ejs$/, '.js'), fn.source);
    });
  }

  logger.info('Setting versions...');

  const versionLogger = logger.createChild('versions');
  for (const packageName of sortedPackages) {
    versionLogger.info(packageName);
    const pkg = packages[packageName];
    const packageJsonPath = path.join(pkg.dist, 'package.json');
    const packageJson = pkg.packageJson;
    const version = pkg.version;

    if (version) {
      packageJson['version'] = version;
    } else {
      versionLogger.error('No version found... Only updating dependencies.');
    }

    for (const depName of Object.keys(packages)) {
      const v = packages[depName].version;
      for (const depKey of ['dependencies', 'peerDependencies', 'devDependencies', 'ng-update']) {
        let obj: JsonObject | null;
        if (depKey === 'ng-update') {
          const updateObject = packageJson[depKey] as JsonObject | null;
          if (!updateObject) {
            continue;
          }
          obj = updateObject['packageGroup'] as JsonObject | null;
        } else {
          obj = packageJson[depKey] as JsonObject | null;
        }
        if (obj && typeof obj === 'object' && obj[depName]) {
          if (argv.local) {
            obj[depName] = packages[depName].tar;
          } else if (argv.snapshot) {
            const pkg = packages[depName];
            if (!pkg.snapshotRepo) {
              versionLogger.error(
                `Package ${JSON.stringify(depName)} is not published as a snapshot. `
                + `Fixing to current version ${v}.`,
              );
              obj[depName] = v;
            } else {
              obj[depName] = `github:${pkg.snapshotRepo}#${pkg.snapshotHash}`;
            }
          } else if ((obj[depName] as string).match(/\b0\.0\.0\b/)) {
            obj[depName] = (obj[depName] as string).replace(/\b0\.0\.0\b/, v);
          }
        }
      }
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  }

  logger.info('Tarring all packages...');
  const tarLogger = logger.createChild('license');
  Object.keys(packages).forEach(pkgName => {
    const pkg = packages[pkgName];
    if (!pkg.private) {
      tarLogger.info(`${pkgName} => ${pkg.tar}`);
      _tar(pkg.tar, pkg.dist);
    }
  });

  logger.info(`Done.`);
}
