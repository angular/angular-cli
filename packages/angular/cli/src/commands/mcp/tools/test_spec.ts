/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { CommandError } from '../host';
import type { MockHost } from '../testing/mock-host';
import { createMockHost } from '../testing/test-utils';
import { runTest } from './test';

describe('Test Tool', () => {
  let mockHost: MockHost;

  beforeEach(() => {
    mockHost = createMockHost();
  });

  it('should construct the command correctly with defaults', async () => {
    await runTest({}, mockHost);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', [
      'test',
      '--browsers',
      'ChromeHeadless',
      '--watch',
      'false',
    ]);
  });

  it('should construct the command correctly with a specified project', async () => {
    await runTest({ project: 'my-lib' }, mockHost);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', [
      'test',
      'my-lib',
      '--browsers',
      'ChromeHeadless',
      '--watch',
      'false',
    ]);
  });

  it('should construct the command correctly with filter', async () => {
    await runTest({ filter: 'AppComponent' }, mockHost);
    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', [
      'test',
      '--browsers',
      'ChromeHeadless',
      '--watch',
      'false',
      '--filter',
      'AppComponent',
    ]);
  });

  it('should handle a successful test run and capture logs', async () => {
    const testLogs = ['Executed 10 of 10 SUCCESS', 'Total: 10 success'];
    mockHost.runCommand.and.resolveTo({
      logs: testLogs,
    });

    const { structuredContent } = await runTest({ project: 'my-app' }, mockHost);

    expect(mockHost.runCommand).toHaveBeenCalledWith('ng', [
      'test',
      'my-app',
      '--browsers',
      'ChromeHeadless',
      '--watch',
      'false',
    ]);
    expect(structuredContent.status).toBe('success');
    expect(structuredContent.logs).toEqual(testLogs);
  });

  it('should handle a failed test run and capture logs', async () => {
    const testLogs = ['Executed 10 of 10 FAILED', 'Error: Some test failed'];
    const error = new CommandError('Test failed', testLogs, 1);
    mockHost.runCommand.and.rejectWith(error);

    const { structuredContent } = await runTest({ project: 'my-failed-app' }, mockHost);

    expect(structuredContent.status).toBe('failure');
    expect(structuredContent.logs).toEqual([...testLogs, 'Test failed']);
  });
});
