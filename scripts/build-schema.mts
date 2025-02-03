/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseDir = resolve(`${__dirname}/..`);
const bazelCmd = process.env.BAZEL ?? `yarn bazel`;
const distRoot = join(baseDir, '/dist-schema/');

function _clean() {
  console.info('Cleaning...');
  console.info('  Removing dist-schema/...');

  return rm(join(__dirname, '../dist-schema'), { force: true, recursive: true, maxRetries: 3 });
}

function _exec(cmd: string, captureStdout: boolean): Promise<string> {
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
      console.info(data.toString().trim());
      if (captureStdout) {
        output += data.toString();
      }
    });
    proc.stderr.on('data', (data) => console.info(data.toString().trim()));

    proc.on('error', (error) => {
      console.error(error.message);
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

async function _buildSchemas(): Promise<void> {
  console.info(`Building schemas...`);

  const queryTargetsCmd = `${bazelCmd} query --output=label "attr(name, .*_schema, //packages/...)"`;
  const targets = (await _exec(queryTargetsCmd, true)).split(/\r?\n/);

  await _exec(`${bazelCmd} build ${targets.join(' ')} --symlink_prefix=${distRoot}`, false);
}

export default async function (argv: {}): Promise<void> {
  await _clean();

  await _buildSchemas();
}
