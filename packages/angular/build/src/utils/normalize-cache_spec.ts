/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { normalizeCacheOptions } from './normalize-cache';

describe('normalizeCacheOptions', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'angular-cache-spec-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should resolve cache path relative to workspace root in a standard repository', async () => {
    const workspaceRoot = join(tempDir, 'project');
    await mkdir(join(workspaceRoot, '.git'), { recursive: true });

    const options = normalizeCacheOptions({}, workspaceRoot);

    expect(options.basePath).toBe(resolve(workspaceRoot, '.angular/cache'));
    expect(options.localBasePath).toBe(resolve(workspaceRoot, '.angular/cache'));
    expect(options.localPath).toBe(resolve(workspaceRoot, '.angular/cache', '0.0.0-PLACEHOLDER'));
  });

  it('should resolve cache path relative to main repository root in a git worktree', async () => {
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

    const options = normalizeCacheOptions({}, worktreeRoot);

    expect(options.basePath).toBe(resolve(mainRepoRoot, '.angular/cache'));
    expect(options.path).toBe(resolve(mainRepoRoot, '.angular/cache', '0.0.0-PLACEHOLDER'));
    expect(options.localBasePath).toBe(resolve(worktreeRoot, '.angular/cache'));
    expect(options.localPath).toBe(resolve(worktreeRoot, '.angular/cache', '0.0.0-PLACEHOLDER'));
  });

  it('should resolve local cache path relative to worktree root with custom relative path', async () => {
    const mainRepoRoot = join(tempDir, 'main-repo');
    const mainGitDir = join(mainRepoRoot, '.git');
    const worktreeRoot = join(tempDir, 'worktree');

    await mkdir(mainGitDir, { recursive: true });

    const worktreeMetadataDir = join(mainGitDir, 'worktrees/wt-1');
    await mkdir(worktreeMetadataDir, { recursive: true });
    await mkdir(worktreeRoot, { recursive: true });
    await writeFile(join(worktreeRoot, '.git'), `gitdir: ${worktreeMetadataDir}`);
    await writeFile(join(worktreeMetadataDir, 'commondir'), '../..');

    const options = normalizeCacheOptions(
      { cli: { cache: { path: 'custom-cache' } } },
      worktreeRoot,
    );

    expect(options.basePath).toBe(resolve(mainRepoRoot, 'custom-cache'));
    expect(options.path).toBe(resolve(mainRepoRoot, 'custom-cache', '0.0.0-PLACEHOLDER'));
    expect(options.localBasePath).toBe(resolve(worktreeRoot, 'custom-cache'));
    expect(options.localPath).toBe(resolve(worktreeRoot, 'custom-cache', '0.0.0-PLACEHOLDER'));
  });

  it('should preserve absolute cache path for both shared and local paths', async () => {
    const mainRepoRoot = join(tempDir, 'main-repo');
    const mainGitDir = join(mainRepoRoot, '.git');
    const worktreeRoot = join(tempDir, 'worktree');
    const absoluteCachePath = join(tempDir, 'absolute-cache');

    await mkdir(mainGitDir, { recursive: true });

    const worktreeMetadataDir = join(mainGitDir, 'worktrees/wt-1');
    await mkdir(worktreeMetadataDir, { recursive: true });
    await mkdir(worktreeRoot, { recursive: true });
    await writeFile(join(worktreeRoot, '.git'), `gitdir: ${worktreeMetadataDir}`);
    await writeFile(join(worktreeMetadataDir, 'commondir'), '../..');

    const options = normalizeCacheOptions(
      { cli: { cache: { path: absoluteCachePath } } },
      worktreeRoot,
    );

    expect(options.basePath).toBe(absoluteCachePath);
    expect(options.path).toBe(resolve(absoluteCachePath, '0.0.0-PLACEHOLDER'));
    expect(options.localBasePath).toBe(absoluteCachePath);
    expect(options.localPath).toBe(resolve(absoluteCachePath, '0.0.0-PLACEHOLDER'));
  });

  it('should resolve cache path relative to workspace root in a git submodule', async () => {
    const mainRepoRoot = join(tempDir, 'main-repo');
    const submoduleRoot = join(mainRepoRoot, 'submodule');

    // Create main repo structure and submodule metadata folder
    const submoduleGitDir = join(mainRepoRoot, '.git/modules/sub');
    await mkdir(submoduleGitDir, { recursive: true });
    await mkdir(submoduleRoot, { recursive: true });

    // Create .git file in submodule pointing to the metadata folder
    await writeFile(join(submoduleRoot, '.git'), `gitdir: ../.git/modules/sub`);

    // Submodules do NOT have a 'commondir' file.
    const options = normalizeCacheOptions({}, submoduleRoot);

    expect(options.basePath).toBe(resolve(submoduleRoot, '.angular/cache'));
    expect(options.localBasePath).toBe(resolve(submoduleRoot, '.angular/cache'));
    expect(options.localPath).toBe(resolve(submoduleRoot, '.angular/cache', '0.0.0-PLACEHOLDER'));
  });

  it('should resolve cache path relative to workspace root when there is no git repository', async () => {
    const workspaceRoot = join(tempDir, 'project');
    await mkdir(workspaceRoot, { recursive: true });

    const options = normalizeCacheOptions({}, workspaceRoot);

    expect(options.basePath).toBe(resolve(workspaceRoot, '.angular/cache'));
    expect(options.localBasePath).toBe(resolve(workspaceRoot, '.angular/cache'));
    expect(options.localPath).toBe(resolve(workspaceRoot, '.angular/cache', '0.0.0-PLACEHOLDER'));
  });
});
