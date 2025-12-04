/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workspaces } from '@angular-devkit/core';
import { AngularWorkspace } from '../../../utilities/config';
import { CommandError } from '../host';
import type { MockHost } from '../testing/mock-host';
import { addProjectToWorkspace, createMockContext } from '../testing/test-utils';
import { runE2e } from './e2e';
import type { McpToolContext } from './tool-registry';

describe('E2E Tool', () => {
  let mockHost: MockHost;
  let mockContext: McpToolContext;
  let mockProjects: workspaces.ProjectDefinitionCollection;
  let mockWorkspace: AngularWorkspace;

  beforeEach(() => {
    const mock = createMockContext();
    mockHost = mock.host;
    mockContext = mock.context;
    mockProjects = mock.projects;
    mockWorkspace = mock.workspace;
  });

  it('should construct the command correctly with defaults', async () => {
    await runE2e({}, mockHost, mockContext);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['e2e']);
  });

  it('should construct the command correctly with a specified project', async () => {
    addProjectToWorkspace(mockProjects, 'my-app', { e2e: { builder: 'mock-builder' } });

    await runE2e({ project: 'my-app' }, mockHost, mockContext);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['e2e', 'my-app']);
  });

  it('should error if project does not have e2e target', async () => {
    addProjectToWorkspace(mockProjects, 'my-app', { build: { builder: 'mock-builder' } });

    const { structuredContent } = await runE2e({ project: 'my-app' }, mockHost, mockContext);

    expect(structuredContent.status).toBe('failure');
    expect(structuredContent.logs?.[0]).toContain("No e2e target is defined for project 'my-app'");
    expect(mockHost.runCommand).not.toHaveBeenCalled();
  });

  it('should error if no project was specified and the default project does not have e2e target', async () => {
    mockWorkspace.extensions['defaultProject'] = 'my-app';
    addProjectToWorkspace(mockProjects, 'my-app', { build: { builder: 'mock-builder' } });

    const { structuredContent } = await runE2e({}, mockHost, mockContext);

    expect(structuredContent.status).toBe('failure');
    expect(structuredContent.logs?.[0]).toContain("No e2e target is defined for project 'my-app'");
    expect(mockHost.runCommand).not.toHaveBeenCalled();
  });

  it('should proceed if no workspace context is available (fallback)', async () => {
    // If context.workspace is undefined, it should try to run ng e2e.
    const noWorkspaceContext = {} as McpToolContext;
    await runE2e({}, mockHost, noWorkspaceContext);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['e2e']);
  });

  it('should handle a successful e2e run with a specified project', async () => {
    addProjectToWorkspace(mockProjects, 'my-app', { e2e: { builder: 'mock-builder' } });
    const e2eLogs = ['E2E passed for my-app'];
    mockHost.runCommand.and.resolveTo({ logs: e2eLogs });

    const { structuredContent } = await runE2e({ project: 'my-app' }, mockHost, mockContext);

    expect(structuredContent.status).toBe('success');
    expect(structuredContent.logs).toEqual(e2eLogs);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['e2e', 'my-app']);
  });

  it('should handle a successful e2e run with the default project', async () => {
    mockWorkspace.extensions['defaultProject'] = 'default-app';
    addProjectToWorkspace(mockProjects, 'default-app', { e2e: { builder: 'mock-builder' } });
    const e2eLogs = ['E2E passed for default-app'];
    mockHost.runCommand.and.resolveTo({ logs: e2eLogs });

    const { structuredContent } = await runE2e({}, mockHost, mockContext);

    expect(structuredContent.status).toBe('success');
    expect(structuredContent.logs).toEqual(e2eLogs);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['e2e']);
  });

  it('should handle a failed e2e run', async () => {
    addProjectToWorkspace(mockProjects, 'my-app', { e2e: { builder: 'mock-builder' } });
    const e2eLogs = ['E2E failed'];
    mockHost.runCommand.and.rejectWith(new CommandError('Failed', e2eLogs, 1));

    const { structuredContent } = await runE2e({ project: 'my-app' }, mockHost, mockContext);

    expect(structuredContent.status).toBe('failure');
    expect(structuredContent.logs).toEqual([...e2eLogs, 'Failed']);
  });
});
