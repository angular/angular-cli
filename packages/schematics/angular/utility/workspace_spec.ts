/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workspaces } from '@angular-devkit/core';
import { EmptyTree, Rule, SchematicContext, Tree, callRule } from '@angular-devkit/schematics';
import {
  buildDefaultPath,
  getWorkspace as readWorkspace,
  updateWorkspace,
  writeWorkspace,
} from './workspace';
import { ProjectType } from './workspace-models';

const TEST_WORKSPACE_CONTENT = JSON.stringify({
  version: 1,
  projects: {
    test: {
      root: '',
    },
  },
});

async function testRule(rule: Rule, tree: Tree): Promise<void> {
  await callRule(rule, tree, {} as unknown as SchematicContext).toPromise();
}

describe('readWorkspace', () => {
  it('reads a workspace using the default path value', async () => {
    const tree = new EmptyTree();
    tree.create('/angular.json', TEST_WORKSPACE_CONTENT);

    const workspace = await readWorkspace(tree);
    expect(workspace.projects.has('test')).toBeTrue();
  });

  it('reads a workspace when specifying a directory path', async () => {
    const tree = new EmptyTree();
    tree.create('/xyz/angular.json', TEST_WORKSPACE_CONTENT);

    const workspace = await readWorkspace(tree, '/xyz/');
    expect(workspace.projects.has('test')).toBeTrue();
  });

  it('reads a workspace when specifying a file path', async () => {
    const tree = new EmptyTree();
    tree.create('/xyz/angular.json', TEST_WORKSPACE_CONTENT);

    const workspace = await readWorkspace(tree, '/xyz/angular.json');
    expect(workspace.projects.has('test')).toBeTrue();
  });

  it('throws if workspace file does not exist when using the default path value', async () => {
    const tree = new EmptyTree();

    await expectAsync(readWorkspace(tree)).toBeRejectedWithError();
  });

  it('throws if workspace file does not exist when specifying a file path', async () => {
    const tree = new EmptyTree();
    tree.create('/angular.json', TEST_WORKSPACE_CONTENT);

    await expectAsync(readWorkspace(tree, 'abc.json')).toBeRejectedWithError();
  });
});

describe('writeWorkspace', () => {
  it('writes a workspace using the default path value', async () => {
    const tree = new EmptyTree();
    tree.create('/angular.json', TEST_WORKSPACE_CONTENT);
    const workspace = await readWorkspace(tree);

    workspace.extensions['x-abc'] = 1;
    await writeWorkspace(tree, workspace);
    expect(tree.readJson('/angular.json')).toEqual(jasmine.objectContaining({ 'x-abc': 1 }));
  });

  it('writes a workspace when specifying a path', async () => {
    const tree = new EmptyTree();
    tree.create('/angular.json', TEST_WORKSPACE_CONTENT);
    const workspace = await readWorkspace(tree);

    workspace.extensions['x-abc'] = 1;
    await writeWorkspace(tree, workspace, '/xyz/angular.json');
    expect(tree.readJson('/xyz/angular.json')).toEqual(jasmine.objectContaining({ 'x-abc': 1 }));
  });
});

describe('updateWorkspace', () => {
  it('updates a workspace using the default path value', async () => {
    const tree = new EmptyTree();
    tree.create('/angular.json', TEST_WORKSPACE_CONTENT);

    const rule = updateWorkspace((workspace) => {
      workspace.projects.add({
        name: 'abc',
        root: 'src',
      });
    });

    await testRule(rule, tree);

    expect(tree.read('angular.json')?.toString()).toContain('"abc"');
  });

  it('throws if workspace file does not exist', async () => {
    const tree = new EmptyTree();

    const rule = updateWorkspace((workspace) => {
      workspace.projects.add({
        name: 'abc',
        root: 'src',
      });
    });

    await expectAsync(testRule(rule, tree)).toBeRejectedWithError();
  });

  it('allows executing a returned followup rule', async () => {
    const tree = new EmptyTree();
    tree.create('/angular.json', TEST_WORKSPACE_CONTENT);

    const rule = updateWorkspace(() => {
      return (tree) => tree.create('/followup.txt', '12345');
    });

    await testRule(rule, tree);

    expect(tree.read('/followup.txt')?.toString()).toContain('12345');
  });
});

describe('buildDefaultPath', () => {
  function createProject(
    projectType: ProjectType | undefined,
    root: string,
    sourceRoot?: string,
  ): workspaces.ProjectDefinition {
    return {
      root,
      sourceRoot,
      extensions: projectType ? { projectType } : {},
      targets: new workspaces.TargetDefinitionCollection(),
    };
  }

  it('returns /<sourceRoot>/app for an application with sourceRoot', () => {
    const project = createProject(ProjectType.Application, 'projects/app', 'projects/app/src');
    expect(buildDefaultPath(project)).toBe('/projects/app/src/app');
  });

  it('returns /<sourceRoot>/app for an application with sourceRoot equal to root', () => {
    const project = createProject(ProjectType.Application, 'projects/app', 'projects/app');
    expect(buildDefaultPath(project)).toBe('/projects/app/app');
  });

  it('returns /<root>/src/app for an application without sourceRoot', () => {
    const project = createProject(ProjectType.Application, 'projects/app');
    expect(buildDefaultPath(project)).toBe('/projects/app/src/app');
  });

  it('returns /<root>/src/lib for a library with sourceRoot equal to root', () => {
    const project = createProject(ProjectType.Library, 'projects/my-lib', 'projects/my-lib');
    expect(buildDefaultPath(project)).toBe('/projects/my-lib/src/lib');
  });

  it('returns /<sourceRoot>/lib for a library with a distinct sourceRoot', () => {
    const project = createProject(ProjectType.Library, 'projects/my-lib', 'projects/my-lib/src');
    expect(buildDefaultPath(project)).toBe('/projects/my-lib/src/lib');
  });

  it('returns /<sourceRoot>/lib for a library with a custom sourceRoot', () => {
    const project = createProject(ProjectType.Library, 'projects/my-lib', 'projects/my-lib/custom');
    expect(buildDefaultPath(project)).toBe('/projects/my-lib/custom/lib');
  });

  it('returns /<root>/src/lib for a library without sourceRoot', () => {
    const project = createProject(ProjectType.Library, 'projects/my-lib');
    expect(buildDefaultPath(project)).toBe('/projects/my-lib/src/lib');
  });
});
