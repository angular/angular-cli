/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { CommandError } from '../host';
import type { MockHost } from '../testing/mock-host';
import {
  MockMcpToolContext,
  addProjectToWorkspace,
  createMockContext,
} from '../testing/test-utils';
import { runBuild } from './build';

describe('Build Tool', () => {
  let mockHost: MockHost;
  let mockContext: MockMcpToolContext;

  beforeEach(() => {
    const mock = createMockContext();
    mockHost = mock.host;
    mockContext = mock.context;
    addProjectToWorkspace(mock.projects, 'my-app');
  });

  it('should construct the command correctly with default configuration', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await runBuild({}, mockContext);
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['build', 'my-app', '-c', 'development'],
      { cwd: '/test' },
    );
  });

  it('should construct the command correctly with a specified project', async () => {
    addProjectToWorkspace(mockContext.workspace.projects, 'another-app');
    await runBuild({ project: 'another-app' }, mockContext);
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['build', 'another-app', '-c', 'development'],
      { cwd: '/test' },
    );
  });

  it('should construct the command correctly for a custom configuration', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await runBuild({ configuration: 'myconfig' }, mockContext);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['build', 'my-app', '-c', 'myconfig'], {
      cwd: '/test',
    });
  });

  it('should handle a successful build and extract the output path and logs', async () => {
    const buildLogs = [
      'Build successful!',
      'Some other log lines...',
      'some warning',
      'Output location: dist/my-app',
    ];
    mockHost.runCommand.and.resolveTo({
      logs: buildLogs,
    });

    const { structuredContent } = await runBuild({ project: 'my-app' }, mockContext);

    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['build', 'my-app', '-c', 'development'],
      { cwd: '/test' },
    );
    expect(structuredContent.status).toBe('success');
    expect(structuredContent.logs).toEqual(buildLogs);
    expect(structuredContent.path).toBe('dist/my-app');
  });

  it('should handle a failed build and capture logs', async () => {
    addProjectToWorkspace(mockContext.workspace.projects, 'my-failed-app');
    const buildLogs = ['Some output before the crash.', 'Error: Something went wrong!'];
    const error = new CommandError('Build failed', buildLogs, 1);
    mockHost.runCommand.and.rejectWith(error);

    const { structuredContent } = await runBuild(
      { project: 'my-failed-app', configuration: 'production' },
      mockContext,
    );

    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['build', 'my-failed-app', '-c', 'production'],
      { cwd: '/test' },
    );
    expect(structuredContent.status).toBe('failure');
    expect(structuredContent.logs).toEqual([...buildLogs, 'Build failed']);
    expect(structuredContent.path).toBeUndefined();
  });

  it('should handle builds where the output path is not found in logs', async () => {
    const buildLogs = ["Some logs that don't match any output path."];
    mockHost.runCommand.and.resolveTo({ logs: buildLogs });

    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    const { structuredContent } = await runBuild({}, mockContext);

    expect(structuredContent.status).toBe('success');
    expect(structuredContent.logs).toEqual(buildLogs);
    expect(structuredContent.path).toBeUndefined();
  });
});
