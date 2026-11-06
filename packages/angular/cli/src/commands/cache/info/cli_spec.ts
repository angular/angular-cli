/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { workspaces } from '@angular-devkit/core';
import assert from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CommandContext } from '../../../command-builder/command-module';
import type { AngularWorkspace } from '../../../utilities/config';
import { CacheInfoCommandModule } from './cli';

describe('CacheInfoCommandModule', () => {
  let tempDir: string;

  beforeEach(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempDir = await mkdtemp(join(baseTmpDir, 'angular-cli-cache-info-spec-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function runInfo(basePath: string): Promise<string> {
    const workspace = {
      basePath,
      extensions: {},
      projects: {} as unknown as workspaces.ProjectDefinitionCollection,
      filePath: join(basePath, 'angular.json'),
      getCli: () => undefined,
      getProjectCli: () => undefined,
      save: () => Promise.resolve(),
    } as unknown as AngularWorkspace;

    const logs: string[] = [];
    const logger = { info: (message: string) => void logs.push(message) };

    await new CacheInfoCommandModule({ workspace, logger } as unknown as CommandContext).run();

    return logs.join('\n');
  }

  it('should print only the shared cache path in a standard repository', async () => {
    const workspaceRoot = join(tempDir, 'project');
    await mkdir(join(workspaceRoot, '.git'), { recursive: true });
    await mkdir(join(workspaceRoot, '.angular/cache/app'), { recursive: true });

    const output = await runInfo(workspaceRoot);

    expect(output).toContain(join(workspaceRoot, '.angular/cache'));
    expect(output).not.toContain('Local path');
  });

  it('should also print the worktree-local cache in a git worktree', async () => {
    const mainRepoRoot = join(tempDir, 'main-repo');
    const mainGitDir = join(mainRepoRoot, '.git');
    const worktreeRoot = join(tempDir, 'worktree');
    const worktreeMetadataDir = join(mainGitDir, 'worktrees/wt-1');

    await mkdir(worktreeMetadataDir, { recursive: true });
    await mkdir(worktreeRoot, { recursive: true });
    await writeFile(join(worktreeRoot, '.git'), `gitdir: ${worktreeMetadataDir}`);
    await writeFile(join(worktreeMetadataDir, 'commondir'), '../..');

    // The shared cache lives in the main checkout, while the development server keeps
    // its Vite cache in the worktree itself.
    await mkdir(join(mainRepoRoot, '.angular/cache/app'), { recursive: true });
    await mkdir(join(worktreeRoot, '.angular/cache/app/dev-server/vite'), { recursive: true });

    const output = await runInfo(worktreeRoot);

    expect(output).toContain(join(mainRepoRoot, '.angular/cache'));
    expect(output).toContain('Local path');
    expect(output).toContain(join(worktreeRoot, '.angular/cache'));
    expect(output).toContain('Local size on disk');
  });
});
