/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import assert from 'assert';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import build from './build.mjs';
import { packages } from './packages.mjs';

export interface CreateOptions {
  _: string[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function _exec(command: string, args: string[], opts: { cwd?: string }) {
  const { status, error, stderr, stdout } = child_process.spawnSync(command, args, { ...opts });

  if (status != 0) {
    console.error(`Command failed: ${command} ${args.map((x) => JSON.stringify(x)).join(', ')}`);
    if (error) {
      console.error('Error: ' + (error ? error.message : 'undefined'));
    } else {
      console.error(`STDERR:\n${stderr}`);
    }
    throw error;
  }

  return { stdout };
}

export default async function (args: CreateOptions, cwd: string): Promise<number> {
  const projectName = args._[0];

  const oldCwd = process.cwd();
  console.info('Building...');
  await build({ local: true });

  process.chdir(cwd);
  console.info('Creating project...');

  assert(projectName, 'Project name must be provided.');

  await _exec(
    'npx',
    [
      '--yes',
      pathToFileURL(path.join(__dirname, '../dist/_angular_cli.tgz')).toString(),
      'new',
      projectName,
      '--skip-install',
      '--skip-git',
      '--no-interactive',
    ],
    { cwd },
  );

  console.info('Updating package.json...');
  const packageJsonPath = path.join(projectName, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  if (!packageJson['dependencies']) {
    packageJson['dependencies'] = {};
  }
  if (!packageJson['devDependencies']) {
    packageJson['devDependencies'] = {};
  }

  // Set the dependencies to the new build we just used.
  for (const packageName of packages.map(({ name }) => name)) {
    const tar = path.join(__dirname, '../dist', packageName.replace(/\/|@/g, '_') + '.tgz');

    if (packageName in packageJson['dependencies']) {
      packageJson['dependencies'][packageName] = tar;
    } else if (packageName in packageJson['devDependencies']) {
      packageJson['devDependencies'][packageName] = tar;
    }
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');

  console.info('Installing npm packages...');
  await _exec('npm', ['install'], { cwd: path.join(cwd, projectName) });

  process.chdir(oldCwd);

  return 0;
}
