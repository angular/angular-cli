/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import create from './create.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createTemporaryProject(): Promise<string> {
  console.info('Creating temporary project...');
  const newProjectTempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'angular-cli-create-'));
  const newProjectName = 'help-project';
  const newProjectRoot = path.join(newProjectTempRoot, newProjectName);
  await create({ _: [newProjectName] }, newProjectTempRoot);

  return newProjectRoot;
}

export interface JsonHelpOptions {
  temporaryProjectRoot?: string;
}

export default async function ({ temporaryProjectRoot }: JsonHelpOptions) {
  console.info('Gathering JSON Help...');

  const newProjectRoot = temporaryProjectRoot ?? (await createTemporaryProject());
  const ngPath = path.join(newProjectRoot, 'node_modules/.bin/ng');
  const helpOutputRoot = path.join(__dirname, '../dist/@angular/cli/help');

  await fs.mkdir(helpOutputRoot);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runNgCommandJsonHelp = async (args: string[]): Promise<any> => {
    const { stdout, status } = spawnSync(ngPath, [...args, '--json-help', '--help'], {
      cwd: newProjectRoot,
      maxBuffer: 200_0000,
      stdio: ['ignore', 'pipe', 'inherit'],
    });

    if (status === 0) {
      try {
        return JSON.parse(stdout.toString().trim());
      } catch (e) {
        console.error(`${e}`);
      }
    }

    throw new Error(`Command failed: ${ngPath} ${args.map((x) => JSON.stringify(x)).join(', ')}.`);
  };

  const { subcommands: commands = [] } = await runNgCommandJsonHelp([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commandsHelp = commands.map((command: any) =>
    runNgCommandJsonHelp([command.name]).then((c) => ({
      ...command,
      ...c,
    })),
  );

  for await (const command of commandsHelp) {
    const commandName = command.name;
    const commandOptionNames = new Set([
      ...command.options.map(({ name }: { name: string }) => name),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subCommandsHelp = command.subcommands?.map((subcommand: any) =>
      runNgCommandJsonHelp([command.name, subcommand.name]).then((s) => ({
        ...s,
        ...subcommand,
        // Filter options which are inherited from the parent command.
        // Ex: `interactive` in `ng generate lib`.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options: s.options.filter((o: any) => !commandOptionNames.has(o.name)),
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
    console.info(filePath);
  }
}
