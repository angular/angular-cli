/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import * as child_process from 'node:child_process';
import { copyFile, readFile, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import build from './build.mjs';
import { packages } from './packages.mjs';

export interface CreateOptions extends Record<string, unknown> {
  _: string[];
}

const __dirname = import.meta.dirname;

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
  const { _, ...otherArgOptions } = args;
  const projectName = _[0];
  assert(projectName, 'Project name must be provided.');

  const ngNewAdditionalOptions = Object.entries(otherArgOptions).map(
    ([key, value]) => `--${key}=${value}`,
  );

  const oldCwd = process.cwd();
  console.info('Building...');

  const buildResult = await build({ local: true });
  const cliBuild = buildResult.find(({ name }) => name === 'angular/cli');

  assert(cliBuild);

  process.chdir(cwd);

  // The below is needed as NPX does not guarantee that the updated version is used unless the file name changes.
  const newTarballName = cliBuild.tarPath.replace('.tgz', '-' + Date.now() + '.tgz');
  await copyFile(cliBuild.tarPath, newTarballName);

  console.info('Creating project...');

  try {
    await _exec(
      'npx',
      [
        '--yes',
        pathToFileURL(newTarballName).toString(),
        'new',
        projectName,
        '--skip-install',
        '--skip-git',
        '--no-interactive',
        ...ngNewAdditionalOptions,
      ],
      { cwd },
    );
  } finally {
    await rm(newTarballName, { maxRetries: 3 });
  }

  console.info('Updating package.json...');
  const packageJsonPath = path.join(projectName, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

  packageJson['dependencies'] ??= {};
  packageJson['devDependencies'] ??= {};
  packageJson['overrides'] ??= {};

  // Set the dependencies to the new build we just used.
  for (const packageName of packages.map(({ name }) => name)) {
    const tar = path.join(__dirname, '../dist', packageName.replace(/\/|@/g, '_') + '.tgz');

    if (packageName in packageJson['dependencies']) {
      packageJson['dependencies'][packageName] = tar;
    } else if (packageName in packageJson['devDependencies']) {
      packageJson['devDependencies'][packageName] = tar;
    } else {
      packageJson['overrides'][packageName] = tar;
    }
  }

  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');

  console.info('Installing npm packages...');
  await _exec('npm', ['install'], { cwd: path.join(cwd, projectName) });

  process.chdir(oldCwd);

  return 0;
}
