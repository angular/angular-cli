/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { spawn } from 'child_process';
import fs from 'fs';
import { join, resolve } from 'path';

const baseDir = resolve(`${__dirname}/..`);
const bazelCmd = process.env.BAZEL ?? `yarn --silent bazel`;
const distRoot = join(baseDir, '/dist-schema/');

function rimraf(location: string) {
  fs.rmSync(location, { force: true, recursive: true, maxRetries: 3 });
}

function _clean(logger: logging.Logger) {
  logger.info('Cleaning...');
  logger.info('  Removing dist-schema/...');
  rimraf(join(__dirname, '../dist-schema'));
}

function _exec(cmd: string, captureStdout: boolean, logger: logging.Logger): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, {
      stdio: 'pipe',
      shell: true,
      env: {
        HOME: process.env.HOME,
        PATH: process.env.PATH,
      },
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

async function _buildSchemas(logger: logging.Logger): Promise<void> {
  logger.info(`Building schemas...`);

  const queryLogger = logger.createChild('query');
  const queryTargetsCmd = `${bazelCmd} query --output=label "attr(name, .*_schema, //packages/...)"`;
  const targets = (await _exec(queryTargetsCmd, true, queryLogger)).split(/\r?\n/);
  const buildLogger = logger.createChild('build');

  await _exec(
    `${bazelCmd} build ${targets.join(' ')} --symlink_prefix=${distRoot}`,
    false,
    buildLogger,
  );
}

export default async function (
  argv: {},
  logger: logging.Logger = new logging.Logger('build-schema-logger'),
): Promise<void> {
  _clean(logger);

  await _buildSchemas(logger);
}
