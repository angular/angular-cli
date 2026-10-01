/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workspaces } from '@angular-devkit/core';
import assert from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { AngularWorkspace } from '../../utilities/config';
import { getCacheConfig } from './utilities';

describe('CLI cache config utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempDir = await mkdtemp(join(baseTmpDir, 'angular-cli-cache-spec-'));
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

  it('should resolve default cache path relative to corresponding nested workspace in main repository for a git worktree', async () => {
    const mainRepoRoot = join(tempDir, 'main-repo');
    const mainGitDir = join(mainRepoRoot, '.git');
    const mainWorkspaceRoot = join(mainRepoRoot, 'Site1/ClientApp');
    const worktreeRoot = join(tempDir, 'worktree');
    const worktreeWorkspaceRoot = join(worktreeRoot, 'Site1/ClientApp');

    // Create main repo with a nested Angular workspace directory
    await mkdir(mainGitDir, { recursive: true });
    await mkdir(mainWorkspaceRoot, { recursive: true });

    // Create worktree with the same nested Angular workspace structure and a .git file at the worktree root
    const worktreeMetadataDir = join(mainGitDir, 'worktrees/wt-1');
    await mkdir(worktreeMetadataDir, { recursive: true });
    await mkdir(worktreeWorkspaceRoot, { recursive: true });
    await writeFile(join(worktreeRoot, '.git'), `gitdir: ${worktreeMetadataDir}`);

    // Point the worktree metadata back to the main .git directory
    await writeFile(join(worktreeMetadataDir, 'commondir'), '../..');

    const config = getCacheConfig(mockWorkspace(worktreeWorkspaceRoot));

    expect(config.path).toBe(resolve(mainWorkspaceRoot, '.angular/cache'));
  });

  it('should fall back to worktree workspace basePath when nested workspace does not exist in main repository', async () => {
    const mainRepoRoot = join(tempDir, 'main-repo');
    const mainGitDir = join(mainRepoRoot, '.git');
    const worktreeRoot = join(tempDir, 'worktree');
    const worktreeWorkspaceRoot = join(worktreeRoot, 'NewSite/ClientApp');

    // Create main repo without the 'NewSite/ClientApp' subdirectory (e.g., added only on the worktree branch)
    await mkdir(mainGitDir, { recursive: true });

    // Create worktree with the new nested Angular workspace and link it to the main repo's .git directory
    const worktreeMetadataDir = join(mainGitDir, 'worktrees/wt-1');
    await mkdir(worktreeMetadataDir, { recursive: true });
    await mkdir(worktreeWorkspaceRoot, { recursive: true });
    await writeFile(join(worktreeRoot, '.git'), `gitdir: ${worktreeMetadataDir}`);
    await writeFile(join(worktreeMetadataDir, 'commondir'), '../..');

    const config = getCacheConfig(mockWorkspace(worktreeWorkspaceRoot));

    expect(config.path).toBe(resolve(worktreeWorkspaceRoot, '.angular/cache'));
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
