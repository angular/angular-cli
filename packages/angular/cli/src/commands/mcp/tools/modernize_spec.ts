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
import { type ModernizeOutput, runModernization } from './modernize';

describe('Modernize Tool', () => {
  let mockHost: MockHost;
  let mockContext: MockMcpToolContext;

  beforeEach(() => {
    const mock = createMockContext();
    mockHost = mock.host;
    mockContext = mock.context;

    addProjectToWorkspace(mock.projects, 'my-app');
    mockContext.workspace.extensions['defaultProject'] = 'my-app';
  });

  it('should return instructions if no transformations are provided', async () => {
    const { structuredContent } = (await runModernization({}, mockContext)) as {
      structuredContent: ModernizeOutput;
    };

    expect(mockHost.runCommand).not.toHaveBeenCalled();
    expect(structuredContent?.instructions).toEqual([
      'See https://angular.dev/best-practices for Angular best practices. ' +
        'You can call this tool if you have specific transformation you want to run.',
    ]);
  });

  it('can run a single transformation', async () => {
    const { structuredContent } = (await runModernization(
      {
        transformations: ['self-closing-tag'],
      },
      mockContext,
    )) as { structuredContent: ModernizeOutput };

    expect(mockHost.runCommand).toHaveBeenCalledOnceWith(
      'ng',
      ['generate', '@angular/core:self-closing-tag', '--project', 'my-app'],
      { cwd: '/test' },
    );
    expect(structuredContent?.instructions).toEqual([
      'Migration self-closing-tag completed successfully.',
    ]);
  });

  it('can run a single transformation with path', async () => {
    const { structuredContent } = (await runModernization(
      {
        transformations: ['self-closing-tag'],
        path: '.',
      },
      mockContext,
    )) as { structuredContent: ModernizeOutput };

    expect(mockHost.runCommand).toHaveBeenCalledOnceWith(
      'ng',
      ['generate', '@angular/core:self-closing-tag', '--project', 'my-app', '--path', '.'],
      { cwd: '/test' },
    );
    expect(structuredContent?.instructions).toEqual([
      'Migration self-closing-tag completed successfully.',
    ]);
  });

  it('can run multiple transformations', async () => {
    const { structuredContent } = (await runModernization(
      {
        transformations: ['control-flow', 'self-closing-tag'],
      },
      mockContext,
    )) as { structuredContent: ModernizeOutput };

    expect(mockHost.runCommand).toHaveBeenCalledTimes(2);
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['generate', '@angular/core:control-flow', '--project', 'my-app'],
      {
        cwd: '/test',
      },
    );
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['generate', '@angular/core:self-closing-tag', '--project', 'my-app'],
      { cwd: '/test' },
    );
    expect(structuredContent?.logs).toEqual([]);
    expect(structuredContent?.instructions).toEqual(
      jasmine.arrayWithExactContents([
        'Migration control-flow completed successfully.',
        'Migration self-closing-tag completed successfully.',
      ]),
    );
  });

  it('should report errors from transformations', async () => {
    // Simulate a failed execution
    mockHost.runCommand.and.rejectWith(
      new CommandError('Command failed with error', ['some logs'], 1),
    );

    const { structuredContent } = (await runModernization(
      {
        transformations: ['self-closing-tag'],
      },
      mockContext,
    )) as { structuredContent: ModernizeOutput };

    expect(mockHost.runCommand).toHaveBeenCalledOnceWith(
      'ng',
      ['generate', '@angular/core:self-closing-tag', '--project', 'my-app'],
      { cwd: '/test' },
    );
    expect(structuredContent?.logs).toEqual(['some logs', 'Command failed with error']);
    expect(structuredContent?.instructions).toEqual(['Migration self-closing-tag failed.']);
  });
});
