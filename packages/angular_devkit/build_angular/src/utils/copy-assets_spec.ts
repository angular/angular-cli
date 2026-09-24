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
import { copyAssets } from './copy-assets';

describe('copyAssets', () => {
  let tempDir: string;
  let workspaceRoot: string;
  let outputDir: string;
  let outsideDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'copy-assets-')));

    workspaceRoot = path.join(tempDir, 'workspace');
    fs.mkdirSync(path.join(workspaceRoot, 'public'), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, 'public', 'favicon.ico'), 'icon');

    outputDir = path.join(tempDir, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    outsideDir = path.join(tempDir, 'outside');
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.writeFileSync(path.join(outsideDir, 'secret.txt'), 'secret');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const copyPublic = (glob = '**/*', followSymlinks?: boolean) =>
    copyAssets(
      [{ glob, input: 'public', output: '.', followSymlinks }],
      [outputDir],
      workspaceRoot,
    );

  it('copies the files within the input directory', async () => {
    const assets = await copyPublic();

    expect(assets.map(({ destination }) => destination)).toEqual(['favicon.ico']);
    expect(fs.existsSync(path.join(outputDir, 'favicon.ico'))).toBeTrue();
  });

  it('does not follow a directory symlink by default', async () => {
    fs.symlinkSync(outsideDir, path.join(workspaceRoot, 'public', 'docs'), 'junction');

    const assets = await copyPublic();

    expect(assets.map(({ destination }) => destination)).toEqual(['favicon.ico']);
    expect(fs.existsSync(path.join(outputDir, 'docs', 'secret.txt'))).toBeFalse();
  });

  it('fails when the glob itself reaches outside the workspace root', async () => {
    // Only the input is checked against the workspace root, while the pattern is joined to
    // it and can walk back out on its own, with no link involved.
    await expectAsync(copyPublic('../../outside/*')).toBeRejectedWithError(
      /asset path must be within the workspace root/,
    );

    expect(fs.existsSync(path.join(outputDir, 'secret.txt'))).toBeFalse();
  });

  it('fails when a glob rooted in a symlink resolves outside the workspace root', async () => {
    fs.symlinkSync(outsideDir, path.join(workspaceRoot, 'public', 'docs'), 'junction');

    // A static directory prefix makes the globber start its walk inside the link, which is
    // read through even though links are not followed.
    await expectAsync(copyPublic('docs/**/*')).toBeRejectedWithError(
      /asset path must be within the workspace root/,
    );

    expect(fs.existsSync(path.join(outputDir, 'docs', 'secret.txt'))).toBeFalse();
  });

  it('fails when a followed symlink resolves outside the workspace root', async () => {
    fs.symlinkSync(outsideDir, path.join(workspaceRoot, 'public', 'docs'), 'junction');

    await expectAsync(copyPublic('**/*', true)).toBeRejectedWithError(
      /asset path must be within the workspace root/,
    );

    expect(fs.existsSync(path.join(outputDir, 'docs', 'secret.txt'))).toBeFalse();
  });

  it('follows a directory symlink that stays within the workspace root when enabled', async () => {
    fs.mkdirSync(path.join(workspaceRoot, 'shared'));
    fs.writeFileSync(path.join(workspaceRoot, 'shared', 'logo.svg'), '<svg></svg>');
    fs.symlinkSync(
      path.join(workspaceRoot, 'shared'),
      path.join(workspaceRoot, 'public', 'branding'),
      'junction',
    );

    const assets = await copyPublic('**/*', true);

    expect(assets.map(({ destination }) => destination).sort()).toEqual([
      path.join('branding', 'logo.svg'),
      'favicon.ico',
    ]);
  });

  it('copies a directory that is given as the root', async () => {
    // Localization copies an already built output directory by passing it as the root.
    const assets = await copyAssets(
      [{ glob: '**/*', input: '.', output: '' }],
      [outputDir],
      outsideDir,
    );

    expect(assets.map(({ destination }) => destination)).toEqual(['secret.txt']);
  });

  it('copies a dependency linked outside the workspace root', async () => {
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

    const assets = await copyAssets(
      [{ glob: '**/*', input: 'node_modules/@company/theme/assets', output: 'assets' }],
      [outputDir],
      workspaceRoot,
    );

    expect(assets.map(({ destination }) => destination)).toEqual([path.join('assets', 'logo.svg')]);
  });
});
