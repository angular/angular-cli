/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { CommandContext } from '../../command-builder/definitions';
import { PackageManager } from '../../package-managers/package-manager';
import { SUPPORTED_PACKAGE_MANAGERS } from '../../package-managers/package-manager-descriptor';
import { MockHost } from '../../package-managers/testing/mock-host';
import { gatherVersionInfo } from './version-info';

describe('gatherVersionInfo', () => {
  let tempRoot: string;

  beforeEach(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-version-info-test-'));
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  function createContext(packageManager: PackageManager): CommandContext {
    return { root: tempRoot, packageManager } as unknown as CommandContext;
  }

  it('should report the package manager version when it is available', async () => {
    const packageManager = new PackageManager(
      new MockHost(),
      tempRoot,
      SUPPORTED_PACKAGE_MANAGERS['npm'],
      { version: '10.9.0' },
    );

    const info = await gatherVersionInfo(createContext(packageManager));

    expect(info.system.packageManager).toEqual({ name: 'npm', version: '10.9.0' });
  });

  it('should not fail when the package manager is not installed', async () => {
    const packageManager = new PackageManager(
      new MockHost(),
      tempRoot,
      SUPPORTED_PACKAGE_MANAGERS['bun'],
      {
        initializationError: new Error(
          `The project is configured to use 'bun', but it is not installed.`,
        ),
      },
    );

    const info = await gatherVersionInfo(createContext(packageManager));

    expect(info.system.packageManager).toEqual({ name: 'bun', version: undefined });
  });
});
