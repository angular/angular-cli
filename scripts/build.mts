/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { spawn } from 'node:child_process';
import { COPYFILE_FICLONE } from 'node:constants';
import fs from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const __dirname = import.meta.dirname;
const baseDir = resolve(`${__dirname}/..`);
const bazelCmd = process.env.BAZEL ?? `pnpm -s bazel`;
const distRoot = join(baseDir, '/dist');

type BuildMode = 'local' | 'snapshot' | 'release';

function _copy(from: string, to: string) {
  // Create parent folder if necessary.
  if (!fs.existsSync(dirname(to))) {
    fs.mkdirSync(dirname(to), { recursive: true });
  }

  // Error out if destination already exists.
  if (fs.existsSync(to)) {
    throw new Error(`Path ${to} already exist...`);
  }

  from = relative(process.cwd(), from);
  to = relative(process.cwd(), to);

  fs.copyFileSync(from, to, COPYFILE_FICLONE);
}

function _recursiveCopy(from: string, to: string, logger: Console) {
  if (!fs.existsSync(from)) {
    logger.error(`File "${from}" does not exist.`);
    process.exit(4);
  }
  if (fs.statSync(from).isDirectory()) {
    fs.readdirSync(from).forEach((fileName) => {
      _recursiveCopy(join(from, fileName), join(to, fileName), logger);
    });
  } else {
    _copy(from, to);
  }
}

function _clean(logger: Console) {
  logger.info('Cleaning...');
  logger.info('  Removing dist/...');

  return fs.promises.rm(join(__dirname, '../dist'), {
    force: true,
    recursive: true,
    maxRetries: 3,
  });
}

function _exec(cmd: string, captureStdout: boolean, logger: Console): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, {
      stdio: 'pipe',
      shell: true,
      cwd: baseDir,
    });

    let output = '';
    proc.stdout.on('data', (data) => {
      logger.info(data.toString().trim());
      if (captureStdout) {
        output += data.toString().trim();
      }
    });
    proc.stderr.on('data', (data) => logger.info(data.toString().trim()));

    proc.on('error', (error) => {
      logger.error(error.message);
    });

    proc.on('exit', (status) => {
      if (status !== 0) {
        reject(`Command failed: ${cmd}`);
      } else {
        resolve(output);
      }
    });
  });
}

async function _build(logger: Console, mode: BuildMode): Promise<string[]> {
  logger.group(`Building (mode=${mode})...`);

  logger.group('Finding targets...');
  const queryTargetsCmd = `${bazelCmd} query --output=label "attr(name, npm_package_archive, //packages/...)"`;
  const targets = (await _exec(queryTargetsCmd, true, logger)).split(/\r?\n/);
  logger.groupEnd();

  // If we are in release mode, run `bazel clean` to ensure the execroot and action cache
  // are not populated. This is necessary because targets using `npm_package` rely on
  // workspace status variables for the package version. Such NPM package targets are not
  // rebuilt if only the workspace status variables change. This could result in accidental
  // re-use of previously built package output with a different `version` in the `package.json`.
  if (mode == 'release') {
    logger.info('Building in release mode. Resetting the Bazel execroot and action cache.');
    await _exec(`${bazelCmd} clean`, false, logger);
  }

  logger.group('Building targets...');
  await _exec(`${bazelCmd} build --config=${mode} ${targets.join(' ')}`, false, logger);
  logger.groupEnd();

  logger.groupEnd();

  return targets;
}

export default async function (
  argv: { local?: boolean; snapshot?: boolean } = {},
): Promise<{ name: string; outputPath: string; tarPath: string }[]> {
  const logger = globalThis.console;

  const bazelBin = await _exec(`${bazelCmd} info bazel-bin`, true, logger);

  await _clean(logger);

  let buildMode: BuildMode;
  if (argv.local) {
    buildMode = 'local';
  } else if (argv.snapshot) {
    buildMode = 'snapshot';
  } else {
    buildMode = 'release';
  }

  const targets = await _build(logger, buildMode);
  const output = [];

  logger.group('Moving packages and tars to dist/');

  for (const target of targets) {
    const packageDir = target.replace(/\/\/packages\/(.*):npm_package_archive/, '$1');
    const bazelOutDir = join(bazelBin, 'packages', packageDir, 'npm_package');
    const tarPathInBin = `${bazelBin}/packages/${packageDir}/npm_package_archive.tgz`;
    const packageJsonPath = `${bazelOutDir}/package.json`;
    const packageName = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).name;
    const destDir = `${distRoot}/${packageName}`;

    logger.info(packageName);

    _recursiveCopy(bazelOutDir, destDir, logger);
    const tarPath = `${distRoot}/${packageName.replace('@', '_').replace('/', '_')}.tgz`;
    _copy(tarPathInBin, tarPath);

    output.push({ name: packageDir, outputPath: destDir, tarPath });
  }

  logger.groupEnd();

  return output;
}
