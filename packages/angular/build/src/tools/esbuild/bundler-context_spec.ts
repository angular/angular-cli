/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Metafile } from 'esbuild';
import { join, relative } from 'node:path';
import { remapMetafileBasePath } from './bundler-context';

describe('remapMetafileBasePath', () => {
  // Simulates a workspace root accessed through a symbolic link or Windows
  // directory junction (`toBase`) that resolves to a different real path
  // (`fromBase`), as esbuild resolves its working directory through links.
  const fromBase = join('/real', 'projects', 'demo');
  const toBase = join('/linked', 'demo');

  /** Creates a metafile path as esbuild would: relative to the resolved (real) base. */
  const fromBaseRelative = (filePath: string): string => relative(fromBase, join(toBase, filePath));

  it('remaps input and output paths onto the target base directory', () => {
    const metafile: Metafile = {
      inputs: {
        [fromBaseRelative('src/main.ts')]: { bytes: 10, imports: [] },
      },
      outputs: {
        [fromBaseRelative('main.js')]: {
          bytes: 100,
          inputs: { [fromBaseRelative('src/main.ts')]: { bytesInOutput: 10 } },
          imports: [{ path: fromBaseRelative('chunk-ABC.js'), kind: 'import-statement' }],
          exports: [],
          entryPoint: fromBaseRelative('src/main.ts'),
          cssBundle: fromBaseRelative('main.css'),
        },
      },
    };

    remapMetafileBasePath(metafile, fromBase, toBase);

    expect(Object.keys(metafile.inputs)).toEqual(['src/main.ts']);
    expect(Object.keys(metafile.outputs)).toEqual(['main.js']);

    const output = metafile.outputs['main.js'];
    expect(output.entryPoint).toBe('src/main.ts');
    expect(output.cssBundle).toBe('main.css');
    expect(Object.keys(output.inputs)).toEqual(['src/main.ts']);
    expect(output.imports[0].path).toBe('chunk-ABC.js');
  });

  it('does not modify virtual and namespaced files', () => {
    const metafile: Metafile = {
      inputs: {
        'angular:polyfills': {
          bytes: 10,
          imports: [{ path: '<runtime>', kind: 'import-statement' }],
        },
      },
      outputs: {
        [fromBaseRelative('polyfills.js')]: {
          bytes: 100,
          inputs: { 'angular:polyfills': { bytesInOutput: 10 } },
          imports: [],
          exports: [],
          entryPoint: 'angular:polyfills',
        },
      },
    };

    remapMetafileBasePath(metafile, fromBase, toBase);

    expect(Object.keys(metafile.inputs)).toEqual(['angular:polyfills']);
    expect(metafile.inputs['angular:polyfills'].imports[0].path).toBe('<runtime>');

    const output = metafile.outputs['polyfills.js'];
    expect(output.entryPoint).toBe('angular:polyfills');
    expect(Object.keys(output.inputs)).toEqual(['angular:polyfills']);
  });

  it('does not modify external imports', () => {
    const externalPath = 'https://example.com/module.js';
    const metafile: Metafile = {
      inputs: {},
      outputs: {
        [fromBaseRelative('main.js')]: {
          bytes: 100,
          inputs: {},
          imports: [{ path: externalPath, kind: 'import-statement', external: true }],
          exports: [],
        },
      },
    };

    remapMetafileBasePath(metafile, fromBase, toBase);

    expect(metafile.outputs['main.js'].imports[0].path).toBe(externalPath);
  });
});
