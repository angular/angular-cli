/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { CommandError } from '../../host';
import type { MockHost } from '../../testing/mock-host';
import {
  type MockMcpToolContext,
  addProjectToWorkspace,
  createMockContext,
} from '../../testing/test-utils';
import { runTarget } from './run-target';

describe('Run Target Tool', () => {
  let mockHost: MockHost;
  let mockContext: MockMcpToolContext;

  beforeEach(() => {
    const mock = createMockContext();
    mockHost = mock.host;
    mockContext = mock.context;
    addProjectToWorkspace(mock.projects, 'my-app');
  });

  it('should construct the command correctly with target and default project', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await runTarget({ target: 'build' }, mockContext);
    expect(mockHost.executeNgCommand).toHaveBeenCalledWith(['build', 'my-app'], { cwd: '/test' });
  });

  it('should construct the command correctly with a specified project', async () => {
    addProjectToWorkspace(mockContext.workspace.projects, 'my-lib');
    await runTarget({ project: 'my-lib', target: 'lint' }, mockContext);
    expect(mockHost.executeNgCommand).toHaveBeenCalledWith(['lint', 'my-lib'], { cwd: '/test' });
  });

  it('should construct the command correctly with configuration', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await runTarget({ target: 'build', configuration: 'production' }, mockContext);
    expect(mockHost.executeNgCommand).toHaveBeenCalledWith(
      ['build', 'my-app', '-c', 'production'],
      {
        cwd: '/test',
      },
    );
  });

  it('should route custom targets via ng run command syntax', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await runTarget({ target: 'storybook', configuration: 'docs' }, mockContext);
    expect(mockHost.executeNgCommand).toHaveBeenCalledWith(
      ['run', 'my-app:storybook', '-c', 'docs'],
      { cwd: '/test' },
    );
  });

  it('should map boolean options correctly to CLI flags', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await runTarget({ target: 'lint', options: { fix: true, quiet: false } }, mockContext);
    expect(mockHost.executeNgCommand).toHaveBeenCalledWith(
      ['lint', 'my-app', '--fix', '--no-quiet'],
      { cwd: '/test' },
    );
  });

  it('should map string and number options correctly to CLI flags and auto-inject no-watch', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await runTarget(
      { target: 'test', options: { browsers: 'ChromeHeadless', timeout: 5000 } },
      mockContext,
    );
    expect(mockHost.executeNgCommand).toHaveBeenCalledWith(
      ['test', 'my-app', '--browsers=ChromeHeadless', '--timeout=5000', '--no-watch'],
      { cwd: '/test' },
    );
  });

  it('should map array options correctly as multiple occurrences of the flag', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await runTarget({ target: 'lint', options: { include: ['a', 'b'] } }, mockContext);
    expect(mockHost.executeNgCommand).toHaveBeenCalledWith(
      ['lint', 'my-app', '--include=a', '--include=b'],
      { cwd: '/test' },
    );
  });

  it('should automatically inject no-watch for test target even if no options provided', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await runTarget({ target: 'test' }, mockContext);
    expect(mockHost.executeNgCommand).toHaveBeenCalledWith(['test', 'my-app', '--no-watch'], {
      cwd: '/test',
    });
  });

  it('should throw an error if option key is malformed (contains whitespace/special chars)', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await expectAsync(
      runTarget({ target: 'lint', options: { 'fix --danger': true } }, mockContext),
    ).toBeRejectedWithError(/Invalid option key: 'fix --danger'/);
  });

  it('should handle a successful execution and return logs', async () => {
    const executionLogs = ['Linting complete', 'All rules passed!'];
    mockHost.executeNgCommand.and.resolveTo({
      logs: executionLogs,
    });

    const { structuredContent } = await runTarget(
      { project: 'my-app', target: 'lint' },
      mockContext,
    );

    expect(structuredContent.status).toBe('success');
    expect(structuredContent.logs).toEqual(executionLogs);
  });

  it('should handle a failed execution and capture command errors', async () => {
    const executionLogs = ['Error: Rule violation found.'];
    const error = new CommandError('Lint failed', executionLogs, 1);
    mockHost.executeNgCommand.and.rejectWith(error);

    const { structuredContent } = await runTarget(
      { project: 'my-app', target: 'lint' },
      mockContext,
    );

    expect(structuredContent.status).toBe('failure');
    expect(structuredContent.logs).toEqual([...executionLogs, 'Lint failed']);
  });

  it('should throw an error if attempting to run the serve target', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await expectAsync(runTarget({ target: 'serve' }, mockContext)).toBeRejectedWithError(
      /Watch mode execution.*is not yet supported/,
    );
  });

  it('should throw an error if attempting to run a target with watch option true', async () => {
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
    await expectAsync(
      runTarget({ target: 'build', options: { watch: true } }, mockContext),
    ).toBeRejectedWithError(/Watch mode execution.*is not yet supported/);
  });
});
