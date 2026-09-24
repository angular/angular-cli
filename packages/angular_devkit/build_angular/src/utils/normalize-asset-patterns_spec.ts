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
import { normalizeAssetPatterns } from './normalize-asset-patterns';

describe('normalizeAssetPatterns', () => {
  let tempDir: string;
  let workspaceRoot: string;
  let outsideDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'normalize-assets-')));

    workspaceRoot = path.join(tempDir, 'workspace');
    fs.mkdirSync(path.join(workspaceRoot, 'src', 'assets'), { recursive: true });

    outsideDir = path.join(tempDir, 'outside');
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.writeFileSync(path.join(outsideDir, 'secret.txt'), 'secret');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const normalize = (input: string) =>
    normalizeAssetPatterns([{ glob: '**/*', input, output: '.' }], workspaceRoot, '', 'src');

  it('normalizes an input within the workspace root', () => {
    expect(normalize('src/assets')).toEqual([{ glob: '**/*', input: 'src/assets', output: '.' }]);
  });

  it('normalizes an input that does not exist', () => {
    expect(normalize('src/not-created-yet')).toEqual([
      { glob: '**/*', input: 'src/not-created-yet', output: '.' },
    ]);
  });

  it('throws for an input outside of the workspace root', () => {
    expect(() => normalize('../outside')).toThrowError(
      /asset path must be within the workspace root/,
    );
  });

  it('throws for an input that is a link outside of the workspace root', () => {
    fs.symlinkSync(outsideDir, path.join(workspaceRoot, 'src', 'docs'), 'junction');

    expect(() => normalize('src/docs')).toThrowError(
      /asset path must be within the workspace root/,
    );
  });

  it('throws for a shorthand pattern that is a link outside of the workspace root', () => {
    fs.symlinkSync(outsideDir, path.join(workspaceRoot, 'src', 'docs'), 'junction');

    expect(() => normalizeAssetPatterns(['src/docs'], workspaceRoot, '', 'src')).toThrowError(
      /asset path must be within the workspace root/,
    );
  });
});
