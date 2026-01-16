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
import { runTest } from './test';

describe('Test Tool', () => {
  let mockHost: MockHost;
  let mockContext: MockMcpToolContext;

  beforeEach(() => {
    const mock = createMockContext();
    mockHost = mock.host;
    mockContext = mock.context;
    addProjectToWorkspace(mock.projects, 'my-app');
  });

  it('should construct the command correctly with defaults', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await runTest({}, mockContext);
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['test', 'my-app', '--browsers', 'ChromeHeadless', '--watch', 'false'],
      { cwd: '/test' },
    );
  });

  it('should construct the command correctly with a specified project', async () => {
    addProjectToWorkspace(mockContext.workspace.projects, 'my-lib');
    await runTest({ project: 'my-lib' }, mockContext);
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['test', 'my-lib', '--browsers', 'ChromeHeadless', '--watch', 'false'],
      { cwd: '/test' },
    );
  });

  it('should construct the command correctly with filter', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await runTest({ filter: 'AppComponent' }, mockContext);
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      [
        'test',
        'my-app',
        '--browsers',
        'ChromeHeadless',
        '--watch',
        'false',
        '--filter',
        'AppComponent',
      ],
      { cwd: '/test' },
    );
  });

  it('should handle a successful test run and capture logs', async () => {
    const testLogs = ['Executed 10 of 10 SUCCESS', 'Total: 10 success'];
    mockHost.runCommand.and.resolveTo({
      logs: testLogs,
    });

    const { structuredContent } = await runTest({ project: 'my-app' }, mockContext);

    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['test', 'my-app', '--browsers', 'ChromeHeadless', '--watch', 'false'],
      { cwd: '/test' },
    );
    expect(structuredContent.status).toBe('success');
    expect(structuredContent.logs).toEqual(testLogs);
  });

  it('should handle a failed test run and capture logs', async () => {
    addProjectToWorkspace(mockContext.workspace.projects, 'my-failed-app');
    const testLogs = ['Executed 10 of 10 FAILED', 'Error: Some test failed'];
    const error = new CommandError('Test failed', testLogs, 1);
    mockHost.runCommand.and.rejectWith(error);

    const { structuredContent } = await runTest({ project: 'my-failed-app' }, mockContext);

    expect(structuredContent.status).toBe('failure');
    expect(structuredContent.logs).toEqual([...testLogs, 'Test failed']);
  });
});
