/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workspaces } from '@angular-devkit/core';
import { AngularWorkspace } from '../../../utilities/config';
import { CommandError, Host } from '../host';
import type { MockHost } from '../testing/mock-host';
import { runE2e } from './e2e';
import type { McpToolContext } from './tool-registry';

describe('E2E Tool', () => {
  let mockHost: MockHost;
  let mockContext: McpToolContext;
  let mockProjects: workspaces.ProjectDefinitionCollection;
  let mockWorkspace: AngularWorkspace;

  beforeEach(() => {
    mockHost = {
      runCommand: jasmine.createSpy<Host['runCommand']>('runCommand').and.resolveTo({ logs: [] }),
    } as unknown as MockHost;

    mockProjects = new workspaces.ProjectDefinitionCollection();
    const mockWorkspaceDefinition: workspaces.WorkspaceDefinition = {
      projects: mockProjects,
      extensions: {},
    };

    mockWorkspace = new AngularWorkspace(mockWorkspaceDefinition, '/test/angular.json');
    mockContext = {
      workspace: mockWorkspace,
    } as McpToolContext;
  });

  function addProject(name: string, targets: Record<string, workspaces.TargetDefinition> = {}) {
    mockProjects.set(name, {
      root: `projects/${name}`,
      extensions: {},
      targets: new workspaces.TargetDefinitionCollection(targets),
    });
  }

  it('should construct the command correctly with defaults', async () => {
    await runE2e({}, mockHost, mockContext);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['e2e']);
  });

  it('should construct the command correctly with a specified project', async () => {
    addProject('my-app', { e2e: { builder: 'mock-builder' } });

    await runE2e({ project: 'my-app' }, mockHost, mockContext);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['e2e', 'my-app']);
  });

  it('should error if project does not have e2e target', async () => {
    addProject('my-app', { build: { builder: 'mock-builder' } });

    const { structuredContent } = await runE2e({ project: 'my-app' }, mockHost, mockContext);

    expect(structuredContent.status).toBe('failure');
    expect(structuredContent.logs?.[0]).toContain("No e2e target is defined for project 'my-app'");
    expect(mockHost.runCommand).not.toHaveBeenCalled();
  });

  it('should error if default project does not have e2e target and no project specified', async () => {
    mockWorkspace.extensions['defaultProject'] = 'my-app';
    addProject('my-app', { build: { builder: 'mock-builder' } });

    const { structuredContent } = await runE2e({}, mockHost, mockContext);

    expect(structuredContent.status).toBe('failure');
    expect(structuredContent.logs?.[0]).toContain("No e2e target is defined for project 'default'");
    expect(mockHost.runCommand).not.toHaveBeenCalled();
  });

  it('should proceed if no workspace context is available (fallback)', async () => {
    // If context.workspace is undefined, it should try to run ng e2e (which might fail or prompt, but tool runs it)
    const noWorkspaceContext = {} as McpToolContext;
    await runE2e({}, mockHost, noWorkspaceContext);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['e2e']);
  });

  it('should handle a successful e2e run', async () => {
    addProject('my-app', { e2e: { builder: 'mock-builder' } });
    const e2eLogs = ['E2E passed'];
    mockHost.runCommand.and.resolveTo({ logs: e2eLogs });

    const { structuredContent } = await runE2e({ project: 'my-app' }, mockHost, mockContext);

    expect(structuredContent.status).toBe('success');
    expect(structuredContent.logs).toEqual(e2eLogs);
  });

  it('should handle a failed e2e run', async () => {
    addProject('my-app', { e2e: { builder: 'mock-builder' } });
    const e2eLogs = ['E2E failed'];
    mockHost.runCommand.and.rejectWith(new CommandError('Failed', e2eLogs, 1));

    const { structuredContent } = await runE2e({ project: 'my-app' }, mockHost, mockContext);

    expect(structuredContent.status).toBe('failure');
    expect(structuredContent.logs).toEqual(e2eLogs);
  });
});
