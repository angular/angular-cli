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
import { createVitestPlugins } from './plugins';

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

    const testFileToEntryPoint = new Map<string, string>([[specFile, 'spec-src-app-app-spec']]);

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
      ((context: { vitest: { config: { root: string } } }) => void) | undefined;
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

    const expectedSetupId = toPosixPath(path.join(workspaceRoot, 'init-compiler.js'));
    const resolvedSetupId = resolveId(`${physicalRoot}/init-compiler.js`, undefined);
    expect(resolvedSetupId).toBe(expectedSetupId);

    const loadedSetup = await load(expectedSetupId);
    expect(loadedSetup?.code).toBe('console.log("init-compiler");');

    const resolvedSpecId = resolveId(`${physicalRoot}/src/app/app.spec.ts`, undefined);
    expect(resolvedSpecId).toBe(specFile);

    const loadedSpec = await load(specFile);
    expect(loadedSpec?.code).toBe('console.log("spec");');
  });
});
