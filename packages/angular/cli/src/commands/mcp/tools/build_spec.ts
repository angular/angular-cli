/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { CommandError, Host } from '../host';
import type { MockHost } from '../testing/mock-host';
import { runBuild } from './build';

describe('Build Tool', () => {
  let mockHost: MockHost;

  beforeEach(() => {
    mockHost = {
      runCommand: jasmine.createSpy<Host['runCommand']>('runCommand').and.resolveTo({ logs: [] }),
      stat: jasmine.createSpy<Host['stat']>('stat'),
      existsSync: jasmine.createSpy<Host['existsSync']>('existsSync'),
    } as MockHost;
  });

  it('should construct the command correctly with default configuration', async () => {
    await runBuild({}, mockHost);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['build', '-c', 'development']);
  });

  it('should construct the command correctly with a specified project', async () => {
    await runBuild({ project: 'another-app' }, mockHost);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', [
      'build',
      'another-app',
      '-c',
      'development',
    ]);
  });

  it('should construct the command correctly for a custom configuration', async () => {
    await runBuild({ configuration: 'myconfig' }, mockHost);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['build', '-c', 'myconfig']);
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

    const { structuredContent } = await runBuild({ project: 'my-app' }, mockHost);

    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', [
      'build',
      'my-app',
      '-c',
      'development',
    ]);
    expect(structuredContent.status).toBe('success');
    expect(structuredContent.logs).toEqual(buildLogs);
    expect(structuredContent.path).toBe('dist/my-app');
  });

  it('should handle a failed build and capture logs', async () => {
    const buildLogs = ['Some output before the crash.', 'Error: Something went wrong!'];
    const error = new CommandError('Build failed', buildLogs, 1);
    mockHost.runCommand.and.rejectWith(error);

    const { structuredContent } = await runBuild(
      { project: 'my-failed-app', configuration: 'production' },
      mockHost,
    );

    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', [
      'build',
      'my-failed-app',
      '-c',
      'production',
    ]);
    expect(structuredContent.status).toBe('failure');
    expect(structuredContent.logs).toEqual(buildLogs);
    expect(structuredContent.path).toBeUndefined();
  });

  it('should handle builds where the output path is not found in logs', async () => {
    const buildLogs = ["Some logs that don't match any output path."];
    mockHost.runCommand.and.resolveTo({ logs: buildLogs });

    const { structuredContent } = await runBuild({}, mockHost);

    expect(structuredContent.status).toBe('success');
    expect(structuredContent.logs).toEqual(buildLogs);
    expect(structuredContent.path).toBeUndefined();
  });
});
