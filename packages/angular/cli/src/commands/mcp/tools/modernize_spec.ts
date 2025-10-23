/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ModernizeOutput, runModernization } from './modernize';
import * as processExecutor from './process-executor';

describe('Modernize Tool', () => {
  let execAsyncSpy: jasmine.Spy;
  let projectDir: string;

  beforeEach(async () => {
    // Create a temporary directory and a fake angular.json to satisfy the tool's project root search.
    projectDir = await mkdtemp(join(tmpdir(), 'angular-modernize-test-'));
    await writeFile(join(projectDir, 'angular.json'), JSON.stringify({ version: 1, projects: {} }));

    // Spy on the execAsync function from our new module.
    execAsyncSpy = spyOn(processExecutor, 'execAsync').and.resolveTo({ stdout: '', stderr: '' });
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it('should return instructions if no transformations are provided', async () => {
    const { structuredContent } = (await runModernization({})) as {
      structuredContent: ModernizeOutput;
    };

    expect(execAsyncSpy).not.toHaveBeenCalled();
    expect(structuredContent?.instructions).toEqual([
      'See https://angular.dev/best-practices for Angular best practices. ' +
        'You can call this tool if you have specific transformation you want to run.',
    ]);
  });

  it('should return instructions if no directories are provided', async () => {
    const { structuredContent } = (await runModernization({
      transformations: ['control-flow'],
    })) as {
      structuredContent: ModernizeOutput;
    };

    expect(execAsyncSpy).not.toHaveBeenCalled();
    expect(structuredContent?.instructions).toEqual([
      'Provide this tool with a list of directory paths in your workspace ' +
        'to run the modernization on.',
    ]);
  });

  it('can run a single transformation', async () => {
    const { structuredContent } = (await runModernization({
      directories: [projectDir],
      transformations: ['self-closing-tag'],
    })) as { structuredContent: ModernizeOutput };

    expect(execAsyncSpy).toHaveBeenCalledOnceWith(
      'ng generate @angular/core:self-closing-tag --path .',
      { cwd: projectDir },
    );
    expect(structuredContent?.stderr).toBeUndefined();
    expect(structuredContent?.instructions).toEqual([
      'Migration self-closing-tag on directory . completed successfully.',
    ]);
  });

  it('can run multiple transformations', async () => {
    const { structuredContent } = (await runModernization({
      directories: [projectDir],
      transformations: ['control-flow', 'self-closing-tag'],
    })) as { structuredContent: ModernizeOutput };

    expect(execAsyncSpy).toHaveBeenCalledTimes(2);
    expect(execAsyncSpy).toHaveBeenCalledWith('ng generate @angular/core:control-flow --path .', {
      cwd: projectDir,
    });
    expect(execAsyncSpy).toHaveBeenCalledWith(
      'ng generate @angular/core:self-closing-tag --path .',
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

    const { structuredContent } = (await runModernization({
      directories: [subfolder1, subfolder2],
      transformations: ['control-flow', 'self-closing-tag'],
    })) as { structuredContent: ModernizeOutput };

    expect(execAsyncSpy).toHaveBeenCalledTimes(4);
    expect(execAsyncSpy).toHaveBeenCalledWith(
      'ng generate @angular/core:control-flow --path subfolder1',
      { cwd: projectDir },
    );
    expect(execAsyncSpy).toHaveBeenCalledWith(
      'ng generate @angular/core:self-closing-tag --path subfolder1',
      { cwd: projectDir },
    );
    expect(execAsyncSpy).toHaveBeenCalledWith(
      'ng generate @angular/core:control-flow --path subfolder2',
      { cwd: projectDir },
    );
    expect(execAsyncSpy).toHaveBeenCalledWith(
      'ng generate @angular/core:self-closing-tag --path subfolder2',
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

  it('should report errors from transformations', async () => {
    // Simulate a failed execution
    execAsyncSpy.and.rejectWith(new Error('Command failed with error'));

    const { structuredContent } = (await runModernization({
      directories: [projectDir],
      transformations: ['self-closing-tag'],
    })) as { structuredContent: ModernizeOutput };

    expect(execAsyncSpy).toHaveBeenCalledOnceWith(
      'ng generate @angular/core:self-closing-tag --path .',
      { cwd: projectDir },
    );
    expect(structuredContent?.stderr).toContain('Command failed with error');
    expect(structuredContent?.instructions).toEqual([
      'Migration self-closing-tag on directory . failed.',
    ]);
  });
});
