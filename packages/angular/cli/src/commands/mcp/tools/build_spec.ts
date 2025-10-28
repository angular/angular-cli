/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { CommandError, Host } from '../host';
import { BuildToolInput, runBuild } from './build';

describe('Build Tool', () => {
  let mockHost: Host;

  beforeEach(() => {
    mockHost = {
      runCommand: jasmine.createSpy('runCommand').and.resolveTo({ stdout: '', stderr: '' }),
      stat: jasmine.createSpy('stat'),
      existsSync: jasmine.createSpy('existsSync'),
    };
  });

  it('should handle a successful build and extract the output path', async () => {
    const buildStdout =
      'Build successful!\nSome other log lines...\nOutput location: dist/my-cool-app';
    (mockHost.runCommand as jasmine.Spy).and.resolveTo({
      stdout: buildStdout,
      stderr: 'some warning',
    });

    const { structuredContent } = await runBuild({ project: 'my-cool-app' }, mockHost);

    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', [
      'build',
      'my-cool-app',
      '-c development',
    ]);
    expect(structuredContent.status).toBe('success');
    expect(structuredContent.stdout).toBe(buildStdout);
    expect(structuredContent.stderr).toBe('some warning');
    expect(structuredContent.path).toBe('dist/my-cool-app');
  });

  it('should handle a failed build and capture logs', async () => {
    const error = new CommandError(
      'Build failed',
      'Some output before the crash.',
      'Error: Something went wrong!',
      1,
    );
    (mockHost.runCommand as jasmine.Spy).and.rejectWith(error);

    const { structuredContent } = await runBuild(
      { project: 'my-failed-app', configuration: 'production' },
      mockHost,
    );

    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['build', 'my-failed-app']);
    expect(structuredContent.status).toBe('failure');
    expect(structuredContent.stdout).toBe('Some output before the crash.');
    expect(structuredContent.stderr).toBe('Error: Something went wrong!');
    expect(structuredContent.path).toBeUndefined();
  });

  it('should construct the command correctly with default configuration', async () => {
    await runBuild({}, mockHost);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['build', '-c development']);
  });

  it('should construct the command correctly with a specified project', async () => {
    await runBuild({ project: 'another-app' }, mockHost);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', [
      'build',
      'another-app',
      '-c development',
    ]);
  });

  it('should construct the command correctly for production configuration', async () => {
    await runBuild({ configuration: 'production' }, mockHost);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', ['build']);
  });

  it('should handle builds where the output path is not found in logs', async () => {
    const buildStdout = 'Build finished, but we could not find the output path string.';
    (mockHost.runCommand as jasmine.Spy).and.resolveTo({ stdout: buildStdout, stderr: '' });

    const { structuredContent } = await runBuild({}, mockHost);

    expect(structuredContent.status).toBe('success');
    expect(structuredContent.stdout).toBe(buildStdout);
    expect(structuredContent.path).toBeUndefined();
  });
});
