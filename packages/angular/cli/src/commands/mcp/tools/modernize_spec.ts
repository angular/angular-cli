/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Stats } from 'fs';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import * as host from '../host';
import { ModernizeOutput, runModernization } from './modernize';

describe('Modernize Tool', () => {
  let projectDir: string;
  let mockHost: host.Host;

  beforeEach(async () => {
    // Create a temporary directory and a fake angular.json to satisfy the tool's project root search.
    projectDir = await mkdtemp(join(tmpdir(), 'angular-modernize-test-'));
    await writeFile(join(projectDir, 'angular.json'), JSON.stringify({ version: 1, projects: {} }));

    mockHost = {
      runCommand: jasmine.createSpy('runCommand').and.resolveTo({ stdout: '', stderr: '' }),
      stat: jasmine.createSpy('stat').and.resolveTo({ isDirectory: () => true } as Stats),
      existsSync: jasmine.createSpy('existsSync').and.callFake((p: string) => {
        return p === join(projectDir, 'angular.json');
      }),
    };
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it('should return instructions if no transformations are provided', async () => {
    const { structuredContent } = (await runModernization({}, mockHost)) as {
      structuredContent: ModernizeOutput;
    };

    expect(mockHost.runCommand).not.toHaveBeenCalled();
    expect(structuredContent?.instructions).toEqual([
      'See https://angular.dev/best-practices for Angular best practices. ' +
        'You can call this tool if you have specific transformation you want to run.',
    ]);
  });

  it('should return instructions if no directories are provided', async () => {
    const { structuredContent } = (await runModernization(
      {
        transformations: ['control-flow'],
      },
      mockHost,
    )) as {
      structuredContent: ModernizeOutput;
    };

    expect(mockHost.runCommand).not.toHaveBeenCalled();
    expect(structuredContent?.instructions).toEqual([
      'Provide this tool with a list of directory paths in your workspace ' +
        'to run the modernization on.',
    ]);
  });

  it('can run a single transformation', async () => {
    const { structuredContent } = (await runModernization(
      {
        directories: [projectDir],
        transformations: ['self-closing-tag'],
      },
      mockHost,
    )) as { structuredContent: ModernizeOutput };

    expect(mockHost.runCommand).toHaveBeenCalledOnceWith(
      'ng',
      ['generate', '@angular/core:self-closing-tag', '--path', '.'],
      { cwd: projectDir },
    );
    expect(structuredContent?.instructions).toEqual([
      'Migration self-closing-tag on directory . completed successfully.',
    ]);
  });

  it('can run multiple transformations', async () => {
    const { structuredContent } = (await runModernization(
      {
        directories: [projectDir],
        transformations: ['control-flow', 'self-closing-tag'],
      },
      mockHost,
    )) as { structuredContent: ModernizeOutput };

    expect(mockHost.runCommand).toHaveBeenCalledTimes(2);
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['generate', '@angular/core:control-flow', '--path', '.'],
      {
        cwd: projectDir,
      },
    );
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['generate', '@angular/core:self-closing-tag', '--path', '.'],
      { cwd: projectDir },
    );
    expect(structuredContent?.stderr).toBeUndefined();
    expect(structuredContent?.instructions).toEqual(
      jasmine.arrayWithExactContents([
        'Migration control-flow on directory . completed successfully.',
        'Migration self-closing-tag on directory . completed successfully.',
      ]),
    );
  });

  it('can run multiple transformations across multiple directories', async () => {
    const subfolder1 = join(projectDir, 'subfolder1');
    const subfolder2 = join(projectDir, 'subfolder2');
    await mkdir(subfolder1);
    await mkdir(subfolder2);

    const { structuredContent } = (await runModernization(
      {
        directories: [subfolder1, subfolder2],
        transformations: ['control-flow', 'self-closing-tag'],
      },
      mockHost,
    )) as { structuredContent: ModernizeOutput };

    expect(mockHost.runCommand).toHaveBeenCalledTimes(4);
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['generate', '@angular/core:control-flow', '--path', 'subfolder1'],
      { cwd: projectDir },
    );
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['generate', '@angular/core:self-closing-tag', '--path', 'subfolder1'],
      { cwd: projectDir },
    );
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['generate', '@angular/core:control-flow', '--path', 'subfolder2'],
      { cwd: projectDir },
    );
    expect(mockHost.runCommand).toHaveBeenCalledWith(
      'ng',
      ['generate', '@angular/core:self-closing-tag', '--path', 'subfolder2'],
      { cwd: projectDir },
    );
    expect(structuredContent?.stderr).toBeUndefined();
    expect(structuredContent?.instructions).toEqual(
      jasmine.arrayWithExactContents([
        'Migration control-flow on directory subfolder1 completed successfully.',
        'Migration self-closing-tag on directory subfolder1 completed successfully.',
        'Migration control-flow on directory subfolder2 completed successfully.',
        'Migration self-closing-tag on directory subfolder2 completed successfully.',
      ]),
    );
  });

  it('should return an error if angular.json is not found', async () => {
    (mockHost.existsSync as jasmine.Spy).and.returnValue(false);

    const { structuredContent } = (await runModernization(
      {
        directories: [projectDir],
        transformations: ['self-closing-tag'],
      },
      mockHost,
    )) as { structuredContent: ModernizeOutput };

    expect(mockHost.runCommand).not.toHaveBeenCalled();
    expect(structuredContent?.instructions).toEqual([
      'Could not find an angular.json file in the current or parent directories.',
    ]);
  });

  it('should report errors from transformations', async () => {
    // Simulate a failed execution
    (mockHost.runCommand as jasmine.Spy).and.rejectWith(
      new host.CommandError('Command failed with error', 'stdout', 'stderr', 1),
    );

    const { structuredContent } = (await runModernization(
      {
        directories: [projectDir],
        transformations: ['self-closing-tag'],
      },
      mockHost,
    )) as { structuredContent: ModernizeOutput };

    expect(mockHost.runCommand).toHaveBeenCalledOnceWith(
      'ng',
      ['generate', '@angular/core:self-closing-tag', '--path', '.'],
      { cwd: projectDir },
    );
    expect(structuredContent?.stdout).toContain('stdout');
    expect(structuredContent?.stderr).toContain('stderr');
    expect(structuredContent?.stderr).toContain('Command failed with error');
    expect(structuredContent?.instructions).toEqual([
      'Migration self-closing-tag on directory . failed.',
    ]);
  });
});
