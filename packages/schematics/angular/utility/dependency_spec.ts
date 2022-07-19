/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  EmptyTree,
  Rule,
  SchematicContext,
  TaskConfigurationGenerator,
  Tree,
  callRule,
  chain,
} from '@angular-devkit/schematics';
import { DependencyType, ExistingBehavior, InstallBehavior, addDependency } from './dependency';

interface LogEntry {
  type: 'warn';
  message: string;
}

async function testRule(
  rule: Rule,
  tree: Tree,
): Promise<{ tasks: TaskConfigurationGenerator[]; logs: LogEntry[] }> {
  const tasks: TaskConfigurationGenerator[] = [];
  const logs: LogEntry[] = [];
  const context = {
    addTask(task: TaskConfigurationGenerator) {
      tasks.push(task);
    },
    logger: {
      warn(message: string): void {
        logs.push({ type: 'warn', message });
      },
    },
  };

  await callRule(rule, tree, context as unknown as SchematicContext).toPromise();

  return { tasks, logs };
}

describe('addDependency', () => {
  it('adds a package to "dependencies" by default', async () => {
    const tree = new EmptyTree();
    tree.create(
      '/package.json',
      JSON.stringify({
        dependencies: {},
      }),
    );

    const rule = addDependency('@angular/core', '^14.0.0');

    await testRule(rule, tree);

    expect(tree.readJson('/package.json')).toEqual({
      dependencies: { '@angular/core': '^14.0.0' },
    });
  });

  it('warns if a package is already present with a different specifier by default', async () => {
    const tree = new EmptyTree();
    tree.create(
      '/package.json',
      JSON.stringify({
        dependencies: { '@angular/core': '^13.0.0' },
      }),
    );

    const rule = addDependency('@angular/core', '^14.0.0');

    const { logs } = await testRule(rule, tree);
    expect(logs).toContain(
      jasmine.objectContaining({
        type: 'warn',
        message:
          'Package dependency "@angular/core" already exists with a different specifier. ' +
          '"^13.0.0" will be replaced with "^14.0.0".',
      }),
    );
  });

  it('warns if a package is already present with a different specifier with replace behavior', async () => {
    const tree = new EmptyTree();
    tree.create(
      '/package.json',
      JSON.stringify({
        dependencies: { '@angular/core': '^13.0.0' },
      }),
    );

    const rule = addDependency('@angular/core', '^14.0.0', { existing: ExistingBehavior.Replace });

    const { logs } = await testRule(rule, tree);
    expect(logs).toContain(
      jasmine.objectContaining({
        type: 'warn',
        message:
          'Package dependency "@angular/core" already exists with a different specifier. ' +
          '"^13.0.0" will be replaced with "^14.0.0".',
      }),
    );
  });

  it('replaces the specifier if a package is already present with a different specifier with replace behavior', async () => {
    const tree = new EmptyTree();
    tree.create(
      '/package.json',
      JSON.stringify({
        dependencies: { '@angular/core': '^13.0.0' },
      }),
    );

    const rule = addDependency('@angular/core', '^14.0.0', { existing: ExistingBehavior.Replace });

    await testRule(rule, tree);

    expect(tree.readJson('/package.json')).toEqual({
      dependencies: { '@angular/core': '^14.0.0' },
    });
  });

  it('does not replace the specifier if a package is already present with a different specifier with skip behavior', async () => {
    const tree = new EmptyTree();
    tree.create(
      '/package.json',
      JSON.stringify({
        dependencies: { '@angular/core': '^13.0.0' },
      }),
    );

    const rule = addDependency('@angular/core', '^14.0.0', { existing: ExistingBehavior.Skip });

    await testRule(rule, tree);

    expect(tree.readJson('/package.json')).toEqual({
      dependencies: { '@angular/core': '^13.0.0' },
    });
  });

  it('adds a package version with other packages in alphabetical order', async () => {
    const tree = new EmptyTree();
    tree.create(
      '/package.json',
      JSON.stringify({
        dependencies: { '@angular/common': '^14.0.0', '@angular/router': '^14.0.0' },
      }),
    );

    const rule = addDependency('@angular/core', '^14.0.0');

    await testRule(rule, tree);

    expect(
      Object.entries((tree.readJson('/package.json') as { dependencies: {} }).dependencies),
    ).toEqual([
      ['@angular/common', '^14.0.0'],
      ['@angular/core', '^14.0.0'],
      ['@angular/router', '^14.0.0'],
    ]);
  });

  it('adds a dependency section if not present', async () => {
    const tree = new EmptyTree();
    tree.create('/package.json', JSON.stringify({}));

    const rule = addDependency('@angular/core', '^14.0.0');

    await testRule(rule, tree);

    expect(tree.readJson('/package.json')).toEqual({
      dependencies: { '@angular/core': '^14.0.0' },
    });
  });

  it('adds a package to "devDependencies" when "type" is "dev"', async () => {
    const tree = new EmptyTree();
    tree.create(
      '/package.json',
      JSON.stringify({
        dependencies: {},
        devDependencies: {},
      }),
    );

    const rule = addDependency('@angular/core', '^14.0.0', { type: DependencyType.Dev });

    await testRule(rule, tree);

    expect(tree.readJson('/package.json')).toEqual({
      dependencies: {},
      devDependencies: { '@angular/core': '^14.0.0' },
    });
  });

  it('adds a package to "peerDependencies" when "type" is "peer"', async () => {
    const tree = new EmptyTree();
    tree.create(
      '/package.json',
      JSON.stringify({
        devDependencies: {},
        peerDependencies: {},
      }),
    );

    const rule = addDependency('@angular/core', '^14.0.0', { type: DependencyType.Peer });

    await testRule(rule, tree);

    expect(tree.readJson('/package.json')).toEqual({
      devDependencies: {},
      peerDependencies: { '@angular/core': '^14.0.0' },
    });
  });

  it('uses specified manifest when provided via "manifestPath" option', async () => {
    const tree = new EmptyTree();
    tree.create('/package.json', JSON.stringify({}));
    tree.create('/abc/package.json', JSON.stringify({}));

    const rule = addDependency('@angular/core', '^14.0.0', {
      packageJsonPath: '/abc/package.json',
    });

    await testRule(rule, tree);

    expect(tree.readJson('/package.json')).toEqual({});
    expect(tree.readJson('/abc/package.json')).toEqual({
      dependencies: { '@angular/core': '^14.0.0' },
    });
  });

  it('schedules a package install task', async () => {
    const tree = new EmptyTree();
    tree.create('/package.json', JSON.stringify({}));

    const rule = addDependency('@angular/core', '^14.0.0');

    const { tasks } = await testRule(rule, tree);

    expect(tasks.map((task) => task.toConfiguration())).toEqual([
      {
        name: 'node-package',
        options: jasmine.objectContaining({ command: 'install', workingDirectory: '/' }),
      },
    ]);
  });

  it('schedules a package install task with working directory when "packageJsonPath" is used', async () => {
    const tree = new EmptyTree();
    tree.create('/abc/package.json', JSON.stringify({}));

    const rule = addDependency('@angular/core', '^14.0.0', {
      packageJsonPath: '/abc/package.json',
    });

    const { tasks } = await testRule(rule, tree);

    expect(tasks.map((task) => task.toConfiguration())).toEqual([
      {
        name: 'node-package',
        options: jasmine.objectContaining({ command: 'install', workingDirectory: '/abc' }),
      },
    ]);
  });

  it('schedules a package install task when install behavior is auto', async () => {
    const tree = new EmptyTree();
    tree.create('/abc/package.json', JSON.stringify({}));

    const rule = addDependency('@angular/core', '^14.0.0', {
      packageJsonPath: '/abc/package.json',
      install: InstallBehavior.Auto,
    });

    const { tasks } = await testRule(rule, tree);

    expect(tasks.map((task) => task.toConfiguration())).toEqual([
      {
        name: 'node-package',
        options: jasmine.objectContaining({ command: 'install', workingDirectory: '/abc' }),
      },
    ]);
  });

  it('schedules a package install task when install behavior is always', async () => {
    const tree = new EmptyTree();
    tree.create('/abc/package.json', JSON.stringify({}));

    const rule = addDependency('@angular/core', '^14.0.0', {
      packageJsonPath: '/abc/package.json',
      install: InstallBehavior.Always,
    });

    const { tasks } = await testRule(rule, tree);

    expect(tasks.map((task) => task.toConfiguration())).toEqual([
      {
        name: 'node-package',
        options: jasmine.objectContaining({ command: 'install', workingDirectory: '/abc' }),
      },
    ]);
  });

  it('does not schedule a package install task when install behavior is none', async () => {
    const tree = new EmptyTree();
    tree.create('/abc/package.json', JSON.stringify({}));

    const rule = addDependency('@angular/core', '^14.0.0', {
      packageJsonPath: '/abc/package.json',
      install: InstallBehavior.None,
    });

    const { tasks } = await testRule(rule, tree);

    expect(tasks).toEqual([]);
  });

  it('does not schedule a package install task if version is the same', async () => {
    const tree = new EmptyTree();
    tree.create(
      '/package.json',
      JSON.stringify({
        dependencies: { '@angular/core': '^14.0.0' },
      }),
    );

    const rule = addDependency('@angular/core', '^14.0.0');

    const { tasks } = await testRule(rule, tree);

    expect(tasks).toEqual([]);
  });

  it('only schedules one package install task for the same manifest path by default', async () => {
    const tree = new EmptyTree();
    tree.create('/package.json', JSON.stringify({}));

    const rule = chain([
      addDependency('@angular/core', '^14.0.0'),
      addDependency('@angular/common', '^14.0.0'),
    ]);

    const { tasks } = await testRule(rule, tree);

    expect(tasks.map((task) => task.toConfiguration())).toEqual([
      {
        name: 'node-package',
        options: jasmine.objectContaining({ command: 'install', workingDirectory: '/' }),
      },
    ]);
  });

  it('only schedules one package install task for the same manifest path with auto install behavior', async () => {
    const tree = new EmptyTree();
    tree.create('/package.json', JSON.stringify({}));

    const rule = chain([
      addDependency('@angular/core', '^14.0.0', { install: InstallBehavior.Auto }),
      addDependency('@angular/common', '^14.0.0', { install: InstallBehavior.Auto }),
    ]);

    const { tasks } = await testRule(rule, tree);

    expect(tasks.map((task) => task.toConfiguration())).toEqual([
      {
        name: 'node-package',
        options: jasmine.objectContaining({ command: 'install', workingDirectory: '/' }),
      },
    ]);
  });

  it('only schedules one package install task for the same manifest path with mixed auto/none install behavior', async () => {
    const tree = new EmptyTree();
    tree.create('/package.json', JSON.stringify({}));

    const rule = chain([
      addDependency('@angular/core', '^14.0.0', { install: InstallBehavior.Auto }),
      addDependency('@angular/common', '^14.0.0', { install: InstallBehavior.None }),
    ]);

    const { tasks } = await testRule(rule, tree);

    expect(tasks.map((task) => task.toConfiguration())).toEqual([
      {
        name: 'node-package',
        options: jasmine.objectContaining({ command: 'install', workingDirectory: '/' }),
      },
    ]);
  });

  it('only schedules one package install task for the same manifest path with mixed always then auto install behavior', async () => {
    const tree = new EmptyTree();
    tree.create('/package.json', JSON.stringify({}));

    const rule = chain([
      addDependency('@angular/core', '^14.0.0', { install: InstallBehavior.Always }),
      addDependency('@angular/common', '^14.0.0', { install: InstallBehavior.Auto }),
    ]);

    const { tasks } = await testRule(rule, tree);

    expect(tasks.map((task) => task.toConfiguration())).toEqual([
      {
        name: 'node-package',
        options: jasmine.objectContaining({ command: 'install', workingDirectory: '/' }),
      },
    ]);
  });

  it('schedules multiple package install tasks for the same manifest path with mixed auto then always install behavior', async () => {
    const tree = new EmptyTree();
    tree.create('/package.json', JSON.stringify({}));

    const rule = chain([
      addDependency('@angular/core', '^14.0.0', { install: InstallBehavior.Auto }),
      addDependency('@angular/common', '^14.0.0', { install: InstallBehavior.Always }),
    ]);

    const { tasks } = await testRule(rule, tree);

    expect(tasks.map((task) => task.toConfiguration())).toEqual([
      {
        name: 'node-package',
        options: jasmine.objectContaining({ command: 'install', workingDirectory: '/' }),
      },
      {
        name: 'node-package',
        options: jasmine.objectContaining({ command: 'install', workingDirectory: '/' }),
      },
    ]);
  });

  it('schedules a package install task for each manifest path present', async () => {
    const tree = new EmptyTree();
    tree.create('/package.json', JSON.stringify({}));
    tree.create('/abc/package.json', JSON.stringify({}));

    const rule = chain([
      addDependency('@angular/core', '^14.0.0'),
      addDependency('@angular/common', '^14.0.0', { packageJsonPath: '/abc/package.json' }),
    ]);

    const { tasks } = await testRule(rule, tree);

    expect(tasks.map((task) => task.toConfiguration())).toEqual([
      {
        name: 'node-package',
        options: jasmine.objectContaining({ command: 'install', workingDirectory: '/' }),
      },
      {
        name: 'node-package',
        options: jasmine.objectContaining({ command: 'install', workingDirectory: '/abc' }),
      },
    ]);
  });

  it('throws an error when the default manifest path does not exist', async () => {
    const tree = new EmptyTree();

    const rule = addDependency('@angular/core', '^14.0.0');

    await expectAsync(testRule(rule, tree)).toBeRejectedWithError(
      undefined,
      `Path "/package.json" does not exist.`,
    );
  });

  it('throws an error when the specified manifest path does not exist', async () => {
    const tree = new EmptyTree();

    const rule = addDependency('@angular/core', '^14.0.0', {
      packageJsonPath: '/abc/package.json',
    });

    await expectAsync(testRule(rule, tree)).toBeRejectedWithError(
      undefined,
      `Path "/abc/package.json" does not exist.`,
    );
  });
});
