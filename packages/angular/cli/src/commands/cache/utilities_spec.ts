/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workspaces } from '@angular-devkit/core';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { AngularWorkspace } from '../../utilities/config';
import { getCacheConfig } from './utilities';

describe('CLI cache config utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'angular-cli-cache-spec-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function mockWorkspace(basePath: string, cliExtension?: unknown): AngularWorkspace {
    return {
      basePath,
      extensions: cliExtension ? { cli: cliExtension } : {},
      projects: {} as unknown as workspaces.ProjectDefinitionCollection,
      filePath: join(basePath, 'angular.json'),
      getCli: () => cliExtension,
      getProjectCli: () => undefined,
      save: () => Promise.resolve(),
    } as unknown as AngularWorkspace;
  }

  it('should resolve default cache path relative to workspace basePath in a standard repository', async () => {
    const workspaceRoot = join(tempDir, 'project');
    await mkdir(join(workspaceRoot, '.git'), { recursive: true });

    const config = getCacheConfig(mockWorkspace(workspaceRoot));

    expect(config.path).toBe(resolve(workspaceRoot, '.angular/cache'));
  });

  it('should resolve default cache path relative to main repository root in a git worktree', async () => {
    const mainRepoRoot = join(tempDir, 'main-repo');
    const mainGitDir = join(mainRepoRoot, '.git');
    const worktreeRoot = join(tempDir, 'worktree');

    // Create main repo structure
    await mkdir(mainGitDir, { recursive: true });

    // Create worktree folder and .git file pointing to the main repo's worktree metadata folder
    const worktreeMetadataDir = join(mainGitDir, 'worktrees/wt-1');
    await mkdir(worktreeMetadataDir, { recursive: true });
    await mkdir(worktreeRoot, { recursive: true });
    await writeFile(join(worktreeRoot, '.git'), `gitdir: ${worktreeMetadataDir}`);

    // Create the commondir file in the worktree metadata folder pointing back to the main .git dir
    await writeFile(join(worktreeMetadataDir, 'commondir'), '../..');

    const config = getCacheConfig(mockWorkspace(worktreeRoot));

    expect(config.path).toBe(resolve(mainRepoRoot, '.angular/cache'));
  });

  it('should resolve custom relative cache path relative to main repository root in a git worktree', async () => {
    const mainRepoRoot = join(tempDir, 'main-repo');
    const mainGitDir = join(mainRepoRoot, '.git');
    const worktreeRoot = join(tempDir, 'worktree');

    // Create main repo structure
    await mkdir(mainGitDir, { recursive: true });

    // Create worktree folder and .git file pointing to the main repo's worktree metadata folder
    const worktreeMetadataDir = join(mainGitDir, 'worktrees/wt-1');
    await mkdir(worktreeMetadataDir, { recursive: true });
    await mkdir(worktreeRoot, { recursive: true });
    await writeFile(join(worktreeRoot, '.git'), `gitdir: ${worktreeMetadataDir}`);

    // Create the commondir file in the worktree metadata folder pointing back to the main .git dir
    await writeFile(join(worktreeMetadataDir, 'commondir'), '../..');

    const config = getCacheConfig(
      mockWorkspace(worktreeRoot, { cache: { path: 'custom/cache-dir' } }),
    );

    expect(config.path).toBe(resolve(mainRepoRoot, 'custom/cache-dir'));
  });

  it('should resolve cache path relative to workspace basePath in a git submodule', async () => {
    const mainRepoRoot = join(tempDir, 'main-repo');
    const submoduleRoot = join(mainRepoRoot, 'submodule');

    // Create main repo structure and submodule metadata folder
    const submoduleGitDir = join(mainRepoRoot, '.git/modules/sub');
    await mkdir(submoduleGitDir, { recursive: true });
    await mkdir(submoduleRoot, { recursive: true });

    // Create .git file in submodule pointing to the metadata folder
    await writeFile(join(submoduleRoot, '.git'), `gitdir: ../.git/modules/sub`);

    // Submodules do NOT have a 'commondir' file.
    const config = getCacheConfig(mockWorkspace(submoduleRoot));

    expect(config.path).toBe(resolve(submoduleRoot, '.angular/cache'));
  });
});
