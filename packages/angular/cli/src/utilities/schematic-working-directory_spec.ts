/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workspaces } from '@angular-devkit/core';
import { join, resolve } from 'node:path';
import { AngularWorkspace, getSchematicWorkingDirectory } from './config';

describe('getSchematicWorkingDirectory', () => {
  const workspaceRoot = resolve('/tmp/workspace');

  function mockWorkspace(
    projects: Record<string, { root: string }>,
  ): AngularWorkspace {
    const collection = new workspaces.ProjectDefinitionCollection();
    for (const [name, { root }] of Object.entries(projects)) {
      collection.set(name, { root } as workspaces.ProjectDefinition);
    }

    return {
      basePath: workspaceRoot,
      projects: collection,
    } as unknown as AngularWorkspace;
  }

  it('returns undefined when cwd is a multi-project application root', () => {
    const workspace = mockWorkspace({
      app1: { root: 'projects/app1' },
      app2: { root: 'projects/app2' },
    });
    const cwd = join(workspaceRoot, 'projects/app1');

    expect(getSchematicWorkingDirectory(workspace, cwd)).toBeUndefined();
  });

  it('returns a path relative to the project when cwd is inside the project tree', () => {
    const workspace = mockWorkspace({
      app1: { root: 'projects/app1' },
      app2: { root: 'projects/app2' },
    });
    const cwd = join(workspaceRoot, 'projects/app1/src/app/features');

    expect(getSchematicWorkingDirectory(workspace, cwd)).toBe('src/app/features');
  });

  it('returns undefined for a single-project workspace when cwd is the workspace root', () => {
    const workspace = mockWorkspace({
      app: { root: '' },
    });

    expect(getSchematicWorkingDirectory(workspace, workspaceRoot)).toBeUndefined();
  });
});
