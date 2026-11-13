/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import { BuildOutputFileType } from '../../../../tools/esbuild/bundler-files';
import { toPosixPath } from '../../../../utils/path';
import type { ResultFile } from '../../../application/results';
import { createVitestPlugins, rebasePath } from './plugins';

describe('rebasePath', () => {
  it('rebases a path from fromRoot to toRoot in POSIX format', () => {
    const fromRoot = path.resolve('/logical-workspace/test-project');
    const toRoot = toPosixPath(path.resolve('/physical-disk/tmp/test-project'));
    const filePath = path.join(fromRoot, 'src/app/app.spec.ts');

    expect(rebasePath(filePath, fromRoot, toRoot)).toBe(`${toRoot}/src/app/app.spec.ts`);
  });

  it('rebases a path outside of fromRoot using its relative location', () => {
    expect(
      rebasePath(
        '/logical/shared/setup.ts',
        '/logical/test-project',
        '/physical/test-project',
        path.posix,
      ),
    ).toBe('/physical/shared/setup.ts');
  });

  it('rebases a Windows path onto a different drive in POSIX format', () => {
    expect(
      rebasePath(
        'X:\\test-project\\src\\app\\app.spec.ts',
        'X:\\test-project',
        'D:/tmp/test-project',
        path.win32,
      ),
    ).toBe('D:/tmp/test-project/src/app/app.spec.ts');
  });

  it('leaves a path on a different Windows drive than fromRoot unchanged', () => {
    expect(
      rebasePath('C:\\shared\\setup.ts', 'X:\\test-project', 'D:/tmp/test-project', path.win32),
    ).toBe('C:/shared/setup.ts');
  });
});

describe('createVitestPlugins', () => {
  it('resolves and loads setup and spec files when vitestConfig.root differs from workspaceRoot', async () => {
    const workspaceRoot = path.resolve('/logical-workspace/test-project');
    const physicalRoot = toPosixPath(path.resolve('/physical-disk/tmp/test-project'));
    const specFile = toPosixPath(path.join(workspaceRoot, 'src/app/app.spec.ts'));

    const buildResultFiles = new Map<string, ResultFile>([
      [
        'init-compiler.js',
        {
          origin: 'memory',
          path: 'init-compiler.js',
          type: BuildOutputFileType.Root,
          contents: new TextEncoder().encode('console.log("init-compiler");'),
          hash: 'hash-init-compiler',
        },
      ],
      [
        'spec-src-app-app-spec.js',
        {
          origin: 'memory',
          path: 'spec-src-app-app-spec.js',
          type: BuildOutputFileType.Root,
          contents: new TextEncoder().encode('console.log("spec");'),
          hash: 'hash-spec',
        },
      ],
    ]);

    const testFileToEntryPoint = new Map<string, string>([
      [specFile, 'spec-src-app-app-spec'],
      ['angular:compiler-init', 'init-compiler'],
    ]);

    const plugins = createVitestPlugins({
      workspaceRoot,
      projectSourceRoot: path.join(workspaceRoot, 'src'),
      projectName: 'test-project',
      buildResultFiles,
      testFileToEntryPoint,
      setupFiles: ['init-compiler.js'],
    });

    const inMemoryPlugin = plugins.find((p) => p.name === 'angular:test-in-memory-provider');
    expect(inMemoryPlugin).toBeDefined();

    const configureVitest = inMemoryPlugin?.configureVitest as
      | ((context: {
          vitest: { config: { root: string; coverage?: { enabled: boolean } } };
        }) => void)
      | undefined;
    configureVitest?.({
      vitest: {
        config: {
          root: physicalRoot,
        },
      },
    });

    const resolveId = inMemoryPlugin?.resolveId as (
      id: string,
      importer: string | undefined,
    ) => string | undefined;
    const load = inMemoryPlugin?.load as (
      id: string,
    ) => Promise<{ code: string; map?: unknown } | undefined>;

    expect(resolveId('angular:compiler-init', undefined)).toBe('angular:compiler-init');

    const expectedSetupId = `${physicalRoot}/init-compiler.js`;
    const resolvedSetupId = resolveId(expectedSetupId, undefined);
    expect(resolvedSetupId).toBe(expectedSetupId);

    const loadedSetup = await load(expectedSetupId);
    expect(loadedSetup?.code).toBe('console.log("init-compiler");');

    const expectedSpecId = `${physicalRoot}/src/app/app.spec.ts`;
    const resolvedSpecId = resolveId(expectedSpecId, undefined);
    expect(resolvedSpecId).toBe(expectedSpecId);

    const loadedSpec = await load(expectedSpecId);
    expect(loadedSpec?.code).toBe('console.log("spec");');
  });

  it('rebases absolute setupFiles for coverage exclusion and handles repeated configureVitest calls', async () => {
    const workspaceRoot = path.resolve('/logical-workspace/test-project');
    const firstPhysicalRoot = toPosixPath(path.resolve('/physical-disk/first/test-project'));
    const secondPhysicalRoot = toPosixPath(path.resolve('/physical-disk/second/test-project'));
    const userSetupFile = toPosixPath(path.join(workspaceRoot, 'src/test-setup.ts'));
    const specFile = toPosixPath(path.join(workspaceRoot, 'src/app/app.spec.ts'));

    const buildResultFiles = new Map<string, ResultFile>([
      [
        'setup-src-test-setup.js',
        {
          origin: 'memory',
          path: 'setup-src-test-setup.js',
          type: BuildOutputFileType.Root,
          contents: new TextEncoder().encode('console.log("user-setup");'),
          hash: 'hash-user-setup',
        },
      ],
      [
        'spec-src-app-app-spec.js',
        {
          origin: 'memory',
          path: 'spec-src-app-app-spec.js',
          type: BuildOutputFileType.Root,
          contents: new TextEncoder().encode('console.log("spec");'),
          hash: 'hash-spec',
        },
      ],
    ]);

    const testFileToEntryPoint = new Map<string, string>([
      [userSetupFile, 'setup-src-test-setup'],
      [specFile, 'spec-src-app-app-spec'],
    ]);

    const plugins = createVitestPlugins({
      workspaceRoot,
      projectSourceRoot: path.join(workspaceRoot, 'src'),
      projectName: 'test-project',
      buildResultFiles,
      testFileToEntryPoint,
      setupFiles: [userSetupFile],
    });

    const inMemoryPlugin = plugins.find((p) => p.name === 'angular:test-in-memory-provider');
    const configureVitest = inMemoryPlugin?.configureVitest as
      | ((context: {
          vitest: { config: { root: string; coverage?: { enabled: boolean } } };
        }) => void)
      | undefined;
    const load = inMemoryPlugin?.load as (
      id: string,
    ) => Promise<{ code: string; map?: unknown } | undefined>;

    configureVitest?.({
      vitest: {
        config: {
          root: firstPhysicalRoot,
          coverage: { enabled: true },
        },
      },
    });
    configureVitest?.({
      vitest: {
        config: {
          root: secondPhysicalRoot,
          coverage: { enabled: true },
        },
      },
    });

    const loadedSetup = await load(`${secondPhysicalRoot}/src/test-setup.ts`);
    expect(loadedSetup?.code).toBe('console.log("user-setup");');

    const loadedSpec = await load(`${secondPhysicalRoot}/src/app/app.spec.ts`);
    expect(loadedSpec?.code).toBe('import "./spec-src-app-app-spec.js";');
  });
});
