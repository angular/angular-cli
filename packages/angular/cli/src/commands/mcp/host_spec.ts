/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalWorkspaceHost, createRootRestrictedHost } from './host';

describe('createRootRestrictedHost', () => {
  let root1: string;
  let root2: string;
  let outsideDir: string;

  beforeEach(() => {
    root1 = mkdtempSync(join(tmpdir(), 'angular-cli-mcp-root1-'));
    root2 = mkdtempSync(join(tmpdir(), 'angular-cli-mcp-root2-'));
    outsideDir = mkdtempSync(join(tmpdir(), 'angular-cli-mcp-outside-'));

    writeFileSync(join(root1, 'file1.txt'), 'root 1 content');
    writeFileSync(join(root2, 'file2.txt'), 'root 2 content');
    writeFileSync(join(outsideDir, 'outside.txt'), 'outside content');
  });

  afterEach(() => {
    rmSync(root1, { recursive: true, force: true });
    rmSync(root2, { recursive: true, force: true });
    rmSync(outsideDir, { recursive: true, force: true });
  });

  it('should allow file access inside any of the configured initial roots', () => {
    const host = createRootRestrictedHost(LocalWorkspaceHost, [root1, root2]);

    expect(host.existsSync(join(root1, 'file1.txt'))).toBeTrue();
    expect(host.existsSync(join(root2, 'file2.txt'))).toBeTrue();
  });

  it('should reject file access outside of the configured roots', () => {
    const host = createRootRestrictedHost(LocalWorkspaceHost, [root1, root2]);

    expect(() => host.existsSync(join(outsideDir, 'outside.txt'))).toThrowError(
      new RegExp(
        `Access denied: path '${join(outsideDir, 'outside.txt')}' is outside allowed roots.`,
      ),
    );
  });

  it('should fall back to initial roots when setRoots is called with an empty array', () => {
    const host = createRootRestrictedHost(LocalWorkspaceHost, [root1, root2]);

    host.setRoots([]);

    expect(host.existsSync(join(root1, 'file1.txt'))).toBeTrue();
    expect(host.existsSync(join(root2, 'file2.txt'))).toBeTrue();
  });
});
