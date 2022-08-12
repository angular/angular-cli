/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import { JsonHelp } from 'packages/angular/cli/src/command-builder/utilities/json-help';
import * as path from 'path';
import { packages } from '../lib/packages';
import create from './create';

export async function createTemporaryProject(logger: logging.Logger): Promise<string> {
  logger.info('Creating temporary project...');
  const newProjectTempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'angular-cli-create-'));
  const newProjectName = 'help-project';
  const newProjectRoot = path.join(newProjectTempRoot, newProjectName);
  await create({ _: [newProjectName] }, logger.createChild('create'), newProjectTempRoot);

  return newProjectRoot;
}

export interface JsonHelpOptions {
  temporaryProjectRoot?: string;
}

export default async function ({ temporaryProjectRoot }: JsonHelpOptions, logger: logging.Logger) {
  logger.info('Gathering JSON Help...');

  const newProjectRoot = temporaryProjectRoot ?? (await createTemporaryProject(logger));
  const ngPath = path.join(newProjectRoot, 'node_modules/.bin/ng');
  const helpOutputRoot = path.join(packages['@angular/cli'].dist, 'help');

  await fs.mkdir(helpOutputRoot);

  const runNgCommandJsonHelp = (args: string[]): Promise<JsonHelp> => {
    const { stdout, status } = spawnSync(ngPath, [...args, '--json-help', '--help'], {
      cwd: newProjectRoot,
      maxBuffer: 200_0000,
      stdio: ['ignore', 'pipe', 'inherit'],
    });

    if (status === 0) {
      return Promise.resolve(JSON.parse(stdout.toString().trim()));
    } else {
      throw new Error(`Command failed: ${ngPath} ${args.map((x) => JSON.stringify(x)).join(', ')}`);
    }
  };

  const { subcommands: commands = [] } = await runNgCommandJsonHelp([]);
  const commandsHelp = commands.map((command) =>
    runNgCommandJsonHelp([command.name]).then((c) => ({
      ...command,
      ...c,
    })),
  );

  for await (const command of commandsHelp) {
    const commandName = command.name;
    const commandOptionNames = new Set([...command.options.map(({ name }) => name)]);

    const subCommandsHelp = command.subcommands?.map((subcommand) =>
      runNgCommandJsonHelp([command.name, subcommand.name]).then((s) => ({
        ...s,
        ...subcommand,
        // Filter options which are inherited from the parent command.
        // Ex: `interactive` in `ng generate lib`.
        options: s.options.filter((o) => !commandOptionNames.has(o.name)),
      })),
    );

    const jsonOutput = JSON.stringify(
      {
        ...command,
        subcommands: subCommandsHelp ? await Promise.all(subCommandsHelp) : undefined,
      },
      undefined,
      2,
    );

    const filePath = path.join(helpOutputRoot, commandName + '.json');
    await fs.writeFile(filePath, jsonOutput);
    logger.info(filePath);
  }
}
