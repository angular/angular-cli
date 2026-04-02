/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeOptions } from './options';
import type { Schema as UnitTestBuilderOptions } from './schema';

function createMockContext(workspaceRoot: string) {
  return {
    workspaceRoot,
    target: { project: 'test-project', target: 'test', configuration: '' },
    logger: { warn: () => {}, info: () => {}, error: () => {}, debug: () => {} },
    getProjectMetadata: async (_projectName: string) => ({
      root: '.',
      sourceRoot: 'src',
    }),
    getBuilderNameForTarget: async () => '@angular/build:application',
  };
}

describe('normalizeOptions', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'angular-cli-options-spec-'));
    // Write a minimal package.json so cache normalization works
    await writeFile(join(workspaceRoot, 'package.json'), '{}');
    // Create a tsconfig.spec.json so tsConfig resolution succeeds
    await mkdir(join(workspaceRoot, 'src'), { recursive: true });
    await writeFile(join(workspaceRoot, 'tsconfig.spec.json'), '{}');
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('should set update to false by default', async () => {
    const options: UnitTestBuilderOptions = {};
    const context = createMockContext(workspaceRoot);

    const normalized = await normalizeOptions(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context as any,
      'test-project',
      options,
    );

    expect(normalized.update).toBeFalse();
  });

  it('should set update to true when update option is true', async () => {
    const options: UnitTestBuilderOptions = { update: true };
    const context = createMockContext(workspaceRoot);

    const normalized = await normalizeOptions(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context as any,
      'test-project',
      options,
    );

    expect(normalized.update).toBeTrue();
  });

  it('should set update to false when update option is explicitly false', async () => {
    const options: UnitTestBuilderOptions = { update: false };
    const context = createMockContext(workspaceRoot);

    const normalized = await normalizeOptions(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context as any,
      'test-project',
      options,
    );

    expect(normalized.update).toBeFalse();
  });
});
