/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { EventEmitter } from 'events';
import { ChildProcess } from 'node:child_process';
import { Host } from '../host';
import { startDevServer } from './start-devserver';
import { stopDevserver } from './stop-devserver';
import { McpToolContext } from './tool-registry';
import { waitForDevserverBuild } from './wait-for-devserver-build';

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = jasmine.createSpy('kill');
}

describe('Serve Tools', () => {
  let mockHost: Host;
  let mockContext: McpToolContext;
  let mockProcess: MockChildProcess;
  let portCounter: number;

  beforeEach(() => {
    portCounter = 12345;
    mockProcess = new MockChildProcess();
    mockHost = {
      spawn: jasmine.createSpy('spawn').and.returnValue(mockProcess as unknown as ChildProcess),
      getAvailablePort: jasmine.createSpy('getAvailablePort').and.callFake(() => {
        return Promise.resolve(portCounter++);
      }),
    } as Partial<Host> as Host;

    mockContext = {
      devServers: new Map(),
    } as Partial<McpToolContext> as McpToolContext;
  });

  it('should start and stop a dev server', async () => {
    const startResult = await startDevServer({}, mockContext, mockHost);
    expect(startResult.structuredContent.message).toBe(
      `Development server for project '<default>' started and watching for workspace changes.`,
    );
    expect(mockHost.spawn).toHaveBeenCalledWith('ng', ['serve', '--port=12345'], { stdio: 'pipe' });

    const stopResult = stopDevserver({}, mockContext);
    expect(stopResult.structuredContent.message).toBe(
      `Development server for project '<default>' stopped.`,
    );
    expect(mockProcess.kill).toHaveBeenCalled();
  });

  it('should find a free port if none is provided', async () => {
    await startDevServer({}, mockContext, mockHost);
    expect(mockHost.getAvailablePort).toHaveBeenCalled();
  });

  it('should wait for a build to complete', async () => {
    await startDevServer({}, mockContext, mockHost);

    const waitPromise = waitForDevserverBuild({ timeout: 10 }, mockContext);

    // Simulate build logs
    mockProcess.stdout.emit('data', '... building ...');
    mockProcess.stdout.emit('data', '✔ Changes detected. Rebuilding...');
    mockProcess.stdout.emit('data', '... more logs ...');
    mockProcess.stdout.emit('data', 'Application bundle generation complete.');

    const waitResult = await waitPromise;
    expect(waitResult.structuredContent.status).toBe('success');
    expect(waitResult.structuredContent.logs).toEqual([
      '✔ Changes detected. Rebuilding...',
      '... more logs ...',
      'Application bundle generation complete.',
    ]);
  });

  it('should handle multiple dev servers', async () => {
    // Start server for project 1
    const startResult1 = await startDevServer({ project: 'app-one' }, mockContext, mockHost);
    expect(startResult1.structuredContent.message).toBe(
      `Development server for project 'app-one' started and watching for workspace changes.`,
    );
    const process1 = mockProcess;

    // Start server for project 2
    mockProcess = new MockChildProcess();
    (mockHost.spawn as jasmine.Spy).and.returnValue(mockProcess as unknown as ChildProcess);
    const startResult2 = await startDevServer({ project: 'app-two' }, mockContext, mockHost);
    expect(startResult2.structuredContent.message).toBe(
      `Development server for project 'app-two' started and watching for workspace changes.`,
    );
    const process2 = mockProcess;

    expect(mockHost.spawn).toHaveBeenCalledWith('ng', ['serve', 'app-one', '--port=12345'], {
      stdio: 'pipe',
    });
    expect(mockHost.spawn).toHaveBeenCalledWith('ng', ['serve', 'app-two', '--port=12346'], {
      stdio: 'pipe',
    });

    // Stop server for project 1
    const stopResult1 = stopDevserver({ project: 'app-one' }, mockContext);
    expect(stopResult1.structuredContent.message).toBe(
      `Development server for project 'app-one' stopped.`,
    );
    expect(process1.kill).toHaveBeenCalled();
    expect(process2.kill).not.toHaveBeenCalled();

    // Stop server for project 2
    const stopResult2 = stopDevserver({ project: 'app-two' }, mockContext);
    expect(stopResult2.structuredContent.message).toBe(
      `Development server for project 'app-two' stopped.`,
    );
    expect(process2.kill).toHaveBeenCalled();
  });

  it('should handle server crash', async () => {
    await startDevServer({ project: 'crash-app' }, mockContext, mockHost);
    mockProcess.emit('close', 1); // Simulate a crash with exit code 1

    const stopResult = stopDevserver({ project: 'crash-app' }, mockContext);
    expect(stopResult.structuredContent.message).toContain('is not running');
  });

  it('wait should timeout if build takes too long', async () => {
    await startDevServer({ project: 'timeout-app' }, mockContext, mockHost);
    const waitResult = await waitForDevserverBuild(
      { project: 'timeout-app', timeout: 10 },
      mockContext,
    );
    expect(waitResult.structuredContent.status).toBe('timeout');
  });
});
