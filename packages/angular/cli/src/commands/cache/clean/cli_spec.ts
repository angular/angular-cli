/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { workspaces } from '@angular-devkit/core';
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CommandContext } from '../../../command-builder/command-module';
import type { AngularWorkspace } from '../../../utilities/config';
import { CacheCleanModule } from './cli';

describe('CacheCleanModule', () => {
  let tempDir: string;

  beforeEach(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempDir = await mkdtemp(join(baseTmpDir, 'angular-cli-cache-clean-spec-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function runClean(basePath: string, cliExtension?: unknown): Promise<void> {
    const workspace = {
      basePath,
      extensions: cliExtension ? { cli: cliExtension } : {},
      projects: {} as unknown as workspaces.ProjectDefinitionCollection,
      filePath: join(basePath, 'angular.json'),
      getCli: () => cliExtension,
      getProjectCli: () => undefined,
      save: () => Promise.resolve(),
    } as unknown as AngularWorkspace;

    return new CacheCleanModule({ workspace } as unknown as CommandContext).run();
  }

  it('should delete the cache of a standard repository', async () => {
    const workspaceRoot = join(tempDir, 'project');
    await mkdir(join(workspaceRoot, '.git'), { recursive: true });
    await mkdir(join(workspaceRoot, '.angular/cache/app'), { recursive: true });

    await runClean(workspaceRoot);

    expect(existsSync(join(workspaceRoot, '.angular/cache'))).toBeFalse();
  });

  it('should delete both the shared and the worktree-local cache in a git worktree', async () => {
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

    await runClean(worktreeRoot);

    expect(existsSync(join(mainRepoRoot, '.angular/cache'))).toBeFalse();
    expect(existsSync(join(worktreeRoot, '.angular/cache'))).toBeFalse();
  });

  it('should succeed when cache directories do not exist', async () => {
    const workspaceRoot = join(tempDir, 'project');
    await mkdir(join(workspaceRoot, '.git'), { recursive: true });

    await expectAsync(runClean(workspaceRoot)).toBeResolved();
  });

  it('should delete both the shared and the worktree-local cache with a custom relative path', async () => {
    const mainRepoRoot = join(tempDir, 'main-repo');
    const mainGitDir = join(mainRepoRoot, '.git');
    const worktreeRoot = join(tempDir, 'worktree');
    const worktreeMetadataDir = join(mainGitDir, 'worktrees/wt-1');

    await mkdir(worktreeMetadataDir, { recursive: true });
    await mkdir(worktreeRoot, { recursive: true });
    await writeFile(join(worktreeRoot, '.git'), `gitdir: ${worktreeMetadataDir}`);
    await writeFile(join(worktreeMetadataDir, 'commondir'), '../..');

    const customCachePath = 'custom-cache-dir';
    await mkdir(join(mainRepoRoot, customCachePath, 'app'), { recursive: true });
    await mkdir(join(worktreeRoot, customCachePath, 'app/dev-server/vite'), { recursive: true });

    await runClean(worktreeRoot, { cache: { path: customCachePath } });

    expect(existsSync(join(mainRepoRoot, customCachePath))).toBeFalse();
    expect(existsSync(join(worktreeRoot, customCachePath))).toBeFalse();
  });
});
