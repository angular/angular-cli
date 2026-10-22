/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging, workspaces } from '@angular-devkit/core';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PackageManager } from '../package-managers';
import { AngularWorkspace } from '../utilities/config';
import { CommandContext } from './definitions';
import { SchematicsCommandModule } from './schematics-command-module';

class TestCommandModule extends SchematicsCommandModule {
  command = 'test';
  describe = false as const;

  run(): Promise<number> {
    return this.runSchematic({
      collectionName: './collection.json',
      schematicName: 'test',
      schematicOptions: {},
      executionOptions: { interactive: false, defaults: false, force: false, dryRun: true },
    });
  }
}

describe('SchematicsCommandModule', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'angular-cli-schematics-command-'));
    writeFileSync(
      join(root, 'collection.json'),
      JSON.stringify({
        schematics: { test: { description: 'Test', factory: './index', schema: './schema.json' } },
      }),
    );
    writeFileSync(
      join(root, 'schema.json'),
      JSON.stringify({
        type: 'object',
        properties: { project: { type: 'string', $default: { $source: 'projectName' } } },
        required: ['project'],
      }),
    );
    writeFileSync(join(root, 'index.js'), 'exports.default = () => (tree) => tree;');
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  async function runWithProjects(projectNames: string[]): Promise<[number, string]> {
    const projects = new workspaces.ProjectDefinitionCollection();
    for (const name of projectNames) {
      projects.add({ name, root: `projects/${name}` });
    }

    const logger = new logging.Logger('test');
    const messages: string[] = [];
    logger.subscribe(({ message }) => messages.push(message));

    const command = new TestCommandModule({
      root,
      logger,
      workspace: new AngularWorkspace({ extensions: {}, projects }, join(root, 'angular.json')),
      packageManager: { name: 'npm' } as PackageManager,
    } as CommandContext);

    const exitCode = await command.run();

    return [exitCode, messages.join('\n')];
  }

  it('should explain how to pick a project when it cannot be determined from the cwd', async () => {
    const [exitCode, output] = await runWithProjects(['second-app', 'first-app']);

    expect(exitCode).toBe(1);
    expect(output).toContain('Cannot determine project for command.');
    expect(output).toContain('Use the "--project" option to specify a project');
    expect(output).toContain('Available projects are:\n- first-app\n- second-app');
    expect(output).not.toContain(`must have required property 'project'`);
  });

  it('should explain that the workspace has no projects', async () => {
    const [exitCode, output] = await runWithProjects([]);

    expect(exitCode).toBe(1);
    expect(output).toContain('This workspace does not contain any projects.');
    expect(output).not.toContain('Available projects are:');
  });
});
