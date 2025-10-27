/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execSync, spawnSync } from 'child_process';
import { BUILD_TOOL, BuildToolInput, runBuild } from './build';
import { McpToolContext } from './tool-registry';

// Mock the execSync function
const mockedExecSync = jasmine.createSpy('execSync');

// Replace the actual execSync with our mock
Object.defineProperty(require('child_process'), 'execSync', {
  value: mockedExecSync,
});

describe('Build Tool', () => {
  beforeEach(() => {
    mockedExecSync.calls.reset();
  });

  it('should handle a successful build and extract the output path', () => {
    const buildLogs =
      'Build successful!\nSome other log lines...\nOutput location: dist/my-cool-app';
    mockedExecSync.and.returnValue(Buffer.from(buildLogs));

    const result = runBuild({ project: 'my-cool-app' });

    expect(mockedExecSync).toHaveBeenCalledWith('ng build my-cool-app -c development');
    expect(result.structuredContent.status).toBe('success');
    expect(result.structuredContent.logs).toBe(buildLogs);
    expect(result.structuredContent.path).toBe('dist/my-cool-app');
  });

  it('should handle a failed build and capture logs', () => {
    const error = new Error('Build failed');
    // Errors thrown from execSync contain the entire result like it would be returned from spawnSync.
    const execSyncError = error as unknown as ReturnType<typeof spawnSync>;
    execSyncError.stdout = Buffer.from('Some output before the crash.');
    execSyncError.stderr = Buffer.from('Error: Something went wrong!');
    mockedExecSync.and.throwError(error);

    const result = runBuild({ project: 'my-failed-app', configuration: 'production' });

    expect(mockedExecSync).toHaveBeenCalledWith('ng build my-failed-app');
    expect(result.structuredContent.status).toBe('failure');
    expect(result.structuredContent.logs).toContain('Build failed');
    expect(result.structuredContent.logs).toContain('STDOUT:\nSome output before the crash.');
    expect(result.structuredContent.logs).toContain('STDERR:\nError: Something went wrong!');
    expect(result.structuredContent.path).toBeUndefined();
  });

  it('should construct the command correctly with default configuration', () => {
    mockedExecSync.and.returnValue(Buffer.from('Success'));
    runBuild({});
    expect(mockedExecSync).toHaveBeenCalledWith('ng build -c development');
  });

  it('should construct the command correctly with a specified project', () => {
    mockedExecSync.and.returnValue(Buffer.from('Success'));
    runBuild({ project: 'another-app' });
    expect(mockedExecSync).toHaveBeenCalledWith('ng build another-app -c development');
  });

  it('should construct the command correctly for production configuration', () => {
    mockedExecSync.and.returnValue(Buffer.from('Success'));
    runBuild({ configuration: 'production' });
    expect(mockedExecSync).toHaveBeenCalledWith('ng build');
  });

  it('should handle builds where the output path is not found in logs', () => {
    const buildLogs = 'Build finished, but we could not find the output path string.';
    mockedExecSync.and.returnValue(Buffer.from(buildLogs));

    const result = runBuild({});

    expect(result.structuredContent.status).toBe('success');
    expect(result.structuredContent.logs).toBe(buildLogs);
    expect(result.structuredContent.path).toBeUndefined();
  });
});
