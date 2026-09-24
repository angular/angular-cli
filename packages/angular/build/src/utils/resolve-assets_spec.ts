/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { resolveAssets } from './resolve-assets';

describe('resolveAssets', () => {
  let tempDir: string;
  let workspaceRoot: string;
  let outsideDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-assets-')));

    workspaceRoot = path.join(tempDir, 'workspace');
    fs.mkdirSync(path.join(workspaceRoot, 'public'), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, 'public', 'favicon.ico'), 'icon');

    outsideDir = path.join(tempDir, 'outside');
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.writeFileSync(path.join(outsideDir, 'secret.txt'), 'secret');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const publicAssets = (followSymlinks?: boolean) => [
    { glob: '**/*', input: 'public', output: '.', followSymlinks },
  ];

  it('resolves the files within the input directory', async () => {
    const assets = await resolveAssets(publicAssets(), workspaceRoot);

    expect(assets.map(({ destination }) => destination)).toEqual(['favicon.ico']);
  });

  it('does not follow a directory symlink by default', async () => {
    fs.symlinkSync(outsideDir, path.join(workspaceRoot, 'public', 'docs'), 'junction');

    const assets = await resolveAssets(publicAssets(), workspaceRoot);

    expect(assets.map(({ destination }) => destination)).toEqual(['favicon.ico']);
  });

  it('does not follow a file symlink by default', async () => {
    fs.symlinkSync(
      path.join(outsideDir, 'secret.txt'),
      path.join(workspaceRoot, 'public', 'notes.txt'),
    );

    const assets = await resolveAssets(publicAssets(), workspaceRoot);

    expect(assets.map(({ destination }) => destination)).toEqual(['favicon.ico']);
  });

  it('follows a directory symlink that stays within the workspace root when enabled', async () => {
    fs.mkdirSync(path.join(workspaceRoot, 'shared'));
    fs.writeFileSync(path.join(workspaceRoot, 'shared', 'logo.svg'), '<svg></svg>');
    fs.symlinkSync(
      path.join(workspaceRoot, 'shared'),
      path.join(workspaceRoot, 'public', 'branding'),
      'junction',
    );

    const assets = await resolveAssets(publicAssets(true), workspaceRoot);

    expect(assets.map(({ destination }) => destination).sort()).toEqual([
      path.join('branding', 'logo.svg'),
      'favicon.ico',
    ]);
  });

  it('fails when the input directory is a symlink outside the workspace root', async () => {
    fs.rmSync(path.join(workspaceRoot, 'public'), { recursive: true });
    fs.symlinkSync(outsideDir, path.join(workspaceRoot, 'public'), 'junction');

    await expectAsync(resolveAssets(publicAssets(), workspaceRoot)).toBeRejectedWithError(
      /asset path must be within the workspace root/,
    );
  });

  it('fails when the glob itself reaches outside the workspace root', async () => {
    // Only the input is checked against the workspace root, while the pattern is joined to
    // it and can walk back out on its own, with no link involved.
    await expectAsync(
      resolveAssets([{ glob: '../../outside/*', input: 'public', output: '.' }], workspaceRoot),
    ).toBeRejectedWithError(/asset path must be within the workspace root/);
  });

  it('fails when a glob rooted in a symlink resolves outside the workspace root', async () => {
    fs.symlinkSync(outsideDir, path.join(workspaceRoot, 'public', 'docs'), 'junction');

    // A static directory prefix makes the globber start its walk inside the link, which is
    // read through even though links are not followed.
    await expectAsync(
      resolveAssets([{ glob: 'docs/**/*', input: 'public', output: '.' }], workspaceRoot),
    ).toBeRejectedWithError(/asset path must be within the workspace root/);
  });

  it('fails when a followed symlink resolves outside the workspace root', async () => {
    fs.symlinkSync(outsideDir, path.join(workspaceRoot, 'public', 'docs'), 'junction');

    await expectAsync(resolveAssets(publicAssets(true), workspaceRoot)).toBeRejectedWithError(
      /asset path must be within the workspace root/,
    );
  });

  it('resolves a dependency linked outside the workspace root', async () => {
    // A package manager keeps the packages of a workspace at the repository root and links
    // to them, so a dependency resolves out of the workspace being built.
    const packageDirectory = path.join(tempDir, 'packages', 'theme', 'assets');
    fs.mkdirSync(packageDirectory, { recursive: true });
    fs.writeFileSync(path.join(packageDirectory, 'logo.svg'), '<svg></svg>');
    fs.mkdirSync(path.join(workspaceRoot, 'node_modules', '@company'), { recursive: true });
    fs.symlinkSync(
      path.join(tempDir, 'packages', 'theme'),
      path.join(workspaceRoot, 'node_modules', '@company', 'theme'),
      'junction',
    );

    const assets = await resolveAssets(
      [{ glob: '**/*', input: 'node_modules/@company/theme/assets', output: 'assets' }],
      workspaceRoot,
    );

    expect(assets.map(({ destination }) => destination)).toEqual([path.join('assets', 'logo.svg')]);
  });

  it('fails when a dependency links back out of itself', async () => {
    fs.mkdirSync(path.join(workspaceRoot, 'node_modules', 'theme', 'assets'), { recursive: true });
    fs.symlinkSync(
      outsideDir,
      path.join(workspaceRoot, 'node_modules', 'theme', 'assets', 'docs'),
      'junction',
    );

    await expectAsync(
      resolveAssets(
        [{ glob: 'docs/**/*', input: 'node_modules/theme/assets', output: 'assets' }],
        workspaceRoot,
      ),
    ).toBeRejectedWithError(/asset path must be within the workspace root/);
  });

  it('resolves an input directory that does not exist', async () => {
    const assets = await resolveAssets(
      [{ glob: '**/*', input: 'not-created-yet', output: '.' }],
      workspaceRoot,
    );

    expect(assets).toEqual([]);
  });

  it('resolves a missing input directory when the workspace root is reached through a symlink', async () => {
    const linkedRoot = path.join(tempDir, 'linked-workspace');
    fs.symlinkSync(workspaceRoot, linkedRoot, 'junction');

    const assets = await resolveAssets(
      [{ glob: '**/*', input: 'not-created-yet', output: '.' }],
      linkedRoot,
    );

    expect(assets).toEqual([]);
  });

  it('resolves assets when the workspace root itself is reached through a symlink', async () => {
    const linkedRoot = path.join(tempDir, 'linked-workspace');
    fs.symlinkSync(workspaceRoot, linkedRoot, 'junction');

    const assets = await resolveAssets(publicAssets(), linkedRoot);

    expect(assets.map(({ destination }) => destination)).toEqual(['favicon.ico']);
  });
});
