/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { EventEmitter } from 'events';
import type { ChildProcess } from 'node:child_process';
import type { MockHost } from '../../testing/mock-host';
import {
  MockMcpToolContext,
  addProjectToWorkspace,
  createMockContext,
} from '../../testing/test-utils';
import { startDevserver } from './devserver-start';
import { stopDevserver } from './devserver-stop';
import { WATCH_DELAY, waitForDevserverBuild } from './devserver-wait-for-build';

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = jasmine.createSpy('kill');
}

describe('Serve Tools', () => {
  let mockHost: MockHost;
  let mockContext: MockMcpToolContext;
  let mockProcess: MockChildProcess;
  let portCounter: number;

  beforeEach(() => {
    portCounter = 12345;
    mockProcess = new MockChildProcess();

    const mock = createMockContext();
    mockHost = mock.host;
    mockContext = mock.context;

    // Customize host spies
    mockHost.spawn.and.returnValue(mockProcess as unknown as ChildProcess);
    mockHost.getAvailablePort.and.callFake(() => Promise.resolve(portCounter++));

    // Setup default project
    addProjectToWorkspace(mock.projects, 'my-app');
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
  });

  it('should start and stop a dev server', async () => {
    const startResult = await startDevserver({}, mockContext);
    expect(startResult.structuredContent.message).toBe(
      `Development server for project 'my-app' started and watching for workspace changes.`,
    );
    expect(mockHost.spawn).toHaveBeenCalledWith('ng', ['serve', 'my-app', '--port=12345'], {
      stdio: 'pipe',
      cwd: '/test',
    });

    const stopResult = await stopDevserver({}, mockContext);
    expect(stopResult.structuredContent.message).toBe(
      `Development server for project 'my-app' stopped.`,
    );
    expect(mockProcess.kill).toHaveBeenCalled();
  });

  it('should wait for a build to complete', async () => {
    await startDevserver({}, mockContext);

    const waitPromise = waitForDevserverBuild({ timeout: 10 }, mockContext);

    // Simulate build logs.
    mockProcess.stdout.emit('data', '... building ...');
    mockProcess.stdout.emit('data', '✔ Changes detected. Rebuilding...');
    mockProcess.stdout.emit('data', '... more logs ...');
    mockProcess.stdout.emit('data', 'Application bundle generation complete.');

    const waitResult = await waitPromise;
    expect(waitResult.structuredContent.status).toBe('success');
    expect(waitResult.structuredContent.logs).toEqual([
      '... building ...',
      '✔ Changes detected. Rebuilding...',
      '... more logs ...',
      'Application bundle generation complete.',
    ]);
  });

  it('should handle multiple dev servers', async () => {
    // Add extra projects
    const projects = mockContext.workspace.projects;
    addProjectToWorkspace(projects, 'app-one');
    addProjectToWorkspace(projects, 'app-two');

    // Start server for project 1. This uses the basic mockProcess created for the tests.
    const startResult1 = await startDevserver({ project: 'app-one' }, mockContext);
    expect(startResult1.structuredContent.message).toBe(
      `Development server for project 'app-one' started and watching for workspace changes.`,
    );
    const process1 = mockProcess;

    // Start server for project 2, returning a new mock process.
    const process2 = new MockChildProcess();
    mockHost.spawn.and.returnValue(process2 as unknown as ChildProcess);
    const startResult2 = await startDevserver({ project: 'app-two' }, mockContext);
    expect(startResult2.structuredContent.message).toBe(
      `Development server for project 'app-two' started and watching for workspace changes.`,
    );

    expect(mockHost.spawn).toHaveBeenCalledWith('ng', ['serve', 'app-one', '--port=12345'], {
      stdio: 'pipe',
      cwd: '/test',
    });
    expect(mockHost.spawn).toHaveBeenCalledWith('ng', ['serve', 'app-two', '--port=12346'], {
      stdio: 'pipe',
      cwd: '/test',
    });

    // Stop server for project 1
    const stopResult1 = await stopDevserver({ project: 'app-one' }, mockContext);
    expect(stopResult1.structuredContent.message).toBe(
      `Development server for project 'app-one' stopped.`,
    );
    expect(process1.kill).toHaveBeenCalled();
    expect(process2.kill).not.toHaveBeenCalled();

    // Stop server for project 2
    const stopResult2 = await stopDevserver({ project: 'app-two' }, mockContext);
    expect(stopResult2.structuredContent.message).toBe(
      `Development server for project 'app-two' stopped.`,
    );
    expect(process2.kill).toHaveBeenCalled();
  });

  it('should handle server crash', async () => {
    addProjectToWorkspace(mockContext.workspace.projects, 'crash-app');
    await startDevserver({ project: 'crash-app' }, mockContext);

    // Simulate a crash with exit code 1
    mockProcess.stdout.emit('data', 'Fatal error.');
    mockProcess.emit('close', 1);

    const stopResult = await stopDevserver({ project: 'crash-app' }, mockContext);
    expect(stopResult.structuredContent.message).toContain('stopped');
    expect(stopResult.structuredContent.logs).toEqual(['Fatal error.']);
  });

  it('wait should timeout if build takes too long', async () => {
    addProjectToWorkspace(mockContext.workspace.projects, 'timeout-app');
    await startDevserver({ project: 'timeout-app' }, mockContext);
    const waitResult = await waitForDevserverBuild(
      { project: 'timeout-app', timeout: 10 },
      mockContext,
    );
    expect(waitResult.structuredContent.status).toBe('timeout');
  });

  it('should wait through multiple cycles for a build to complete', async () => {
    jasmine.clock().install();
    try {
      await startDevserver({}, mockContext);

      // Immediately simulate a build starting so isBuilding() is true.
      mockProcess.stdout.emit('data', '❯ Changes detected. Rebuilding...');

      const waitPromise = waitForDevserverBuild({ timeout: 5 * WATCH_DELAY }, mockContext);

      // Allow the async resolveWorkspaceAndProject to complete.
      await Promise.resolve();

      // Tick past the first debounce. The while loop will be entered.
      jasmine.clock().tick(WATCH_DELAY + 1);

      // Tick past the second debounce (inside the loop).
      jasmine.clock().tick(WATCH_DELAY + 1);

      // Now finish the build.
      mockProcess.stdout.emit('data', 'Application bundle generation complete.');

      // Tick past another debounce to exit the loop.
      jasmine.clock().tick(WATCH_DELAY + 1);

      const waitResult = await waitPromise;

      expect(waitResult.structuredContent.status).toBe('success');
      expect(waitResult.structuredContent.logs).toEqual([
        '❯ Changes detected. Rebuilding...',
        'Application bundle generation complete.',
      ]);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('should fail with list of running servers when server not found', async () => {
    addProjectToWorkspace(mockContext.workspace.projects, 'app-one');
    addProjectToWorkspace(mockContext.workspace.projects, 'app-two');
    // Start app-one
    await startDevserver({ project: 'app-one' }, mockContext);

    // Try to stop app-two (which is not running)
    try {
      await stopDevserver({ project: 'app-two' }, mockContext);
      fail('Should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('Dev server not found. Currently running servers:');
      expect((e as Error).message).toContain("- Project 'app-one' in workspace path '/test'");
    }
  });
});
