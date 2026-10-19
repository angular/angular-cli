/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Metafile } from 'esbuild';
import { type InitialFileRecord, findTransitiveInitialFiles } from './bundler-files';

function createMetafile(
  outputs: Record<
    string,
    {
      imports: {
        path: string;
        kind: 'import-statement' | 'import-rule' | 'dynamic-import';
        external?: boolean;
      }[];
    }
  >,
): Metafile {
  return {
    inputs: {},
    outputs: Object.fromEntries(
      Object.entries(outputs).map(([key, value]) => [
        key,
        {
          bytes: 0,
          inputs: {},
          imports: value.imports,
          exports: [],
        },
      ]),
    ),
  };
}

describe('findTransitiveInitialFiles', () => {
  it('should compute minimum depth and propagate it to transitive children in a DAG', () => {
    // main (0) -> [a (1), b (1)]
    // b (1) -> c (2) -> d (via b: 3, via a: 2) -> e (should be 3, not 4)
    // a (1) -> d (2)
    const metafile = createMetafile({
      'main.js': {
        imports: [
          { path: 'chunk-a.js', kind: 'import-statement' },
          { path: 'chunk-b.js', kind: 'import-statement' },
        ],
      },
      'chunk-a.js': {
        imports: [{ path: 'chunk-d.js', kind: 'import-statement' }],
      },
      'chunk-b.js': {
        imports: [{ path: 'chunk-c.js', kind: 'import-statement' }],
      },
      'chunk-c.js': {
        imports: [{ path: 'chunk-d.js', kind: 'import-statement' }],
      },
      'chunk-d.js': {
        imports: [{ path: 'chunk-e.js', kind: 'import-statement' }],
      },
      'chunk-e.js': {
        imports: [],
      },
    });

    const initialFiles = new Map<string, InitialFileRecord>([
      ['main.js', { entrypoint: true, name: 'main', type: 'script', serverFile: false, depth: 0 }],
    ]);

    findTransitiveInitialFiles(metafile, initialFiles);

    expect(initialFiles.get('chunk-a.js')?.depth).toBe(1);
    expect(initialFiles.get('chunk-b.js')?.depth).toBe(1);
    expect(initialFiles.get('chunk-c.js')?.depth).toBe(2);
    expect(initialFiles.get('chunk-d.js')?.depth).toBe(2);
    expect(initialFiles.get('chunk-e.js')?.depth).toBe(3);
  });

  it('should record files in breadth-first forward import order', () => {
    const metafile = createMetafile({
      'main.js': {
        imports: [
          { path: 'chunk-a.js', kind: 'import-statement' },
          { path: 'chunk-b.js', kind: 'import-statement' },
        ],
      },
      'chunk-a.js': {
        imports: [{ path: 'chunk-a1.js', kind: 'import-statement' }],
      },
      'chunk-b.js': {
        imports: [{ path: 'chunk-b1.js', kind: 'import-statement' }],
      },
      'chunk-a1.js': { imports: [] },
      'chunk-b1.js': { imports: [] },
    });

    const initialFiles = new Map<string, InitialFileRecord>([
      ['main.js', { entrypoint: true, name: 'main', type: 'script', serverFile: false, depth: 0 }],
    ]);

    findTransitiveInitialFiles(metafile, initialFiles);

    expect([...initialFiles.keys()]).toEqual([
      'main.js',
      'chunk-a.js',
      'chunk-b.js',
      'chunk-a1.js',
      'chunk-b1.js',
    ]);
  });

  it('should ignore dynamic imports and handle external and style imports', () => {
    const metafile = createMetafile({
      'main.js': {
        imports: [
          { path: 'lazy.js', kind: 'dynamic-import' },
          { path: '@angular/core', kind: 'import-statement', external: true },
        ],
      },
      'styles.css': {
        imports: [{ path: 'https://example.com/font.css', kind: 'import-rule', external: true }],
      },
      'lazy.js': {
        imports: [{ path: 'lazy-dep.js', kind: 'import-statement' }],
      },
    });

    const initialFiles = new Map<string, InitialFileRecord>([
      ['main.js', { entrypoint: true, name: 'main', type: 'script', serverFile: false, depth: 0 }],
      [
        'styles.css',
        { entrypoint: true, name: 'styles', type: 'style', serverFile: false, depth: 0 },
      ],
    ]);

    findTransitiveInitialFiles(metafile, initialFiles);

    expect(initialFiles.has('lazy.js')).toBeFalse();
    expect(initialFiles.has('lazy-dep.js')).toBeFalse();
    expect(initialFiles.get('@angular/core')).toEqual({
      type: 'script',
      entrypoint: false,
      external: true,
      serverFile: false,
      depth: 1,
    });
    expect(initialFiles.get('https://example.com/font.css')).toEqual({
      type: 'style',
      entrypoint: false,
      external: true,
      serverFile: false,
      depth: 1,
    });
  });

  it('should only traverse from provided entriesToAnalyze while preserving existing initialFiles', () => {
    const metafile = createMetafile({
      'main.js': {
        imports: [{ path: 'chunk-main.js', kind: 'import-statement' }],
      },
      'polyfills.js': {
        imports: [{ path: 'chunk-polyfills.js', kind: 'import-statement' }],
      },
      'chunk-main.js': { imports: [] },
      'chunk-polyfills.js': { imports: [] },
    });

    const mainRecord: InitialFileRecord = {
      entrypoint: true,
      name: 'main',
      type: 'script',
      serverFile: false,
      depth: 0,
    };
    const polyfillsRecord: InitialFileRecord = {
      entrypoint: true,
      name: 'polyfills',
      type: 'script',
      serverFile: false,
      depth: 0,
    };
    const initialFiles = new Map<string, InitialFileRecord>([
      ['main.js', mainRecord],
      ['polyfills.js', polyfillsRecord],
    ]);

    const entriesToAnalyze: [string, InitialFileRecord][] = [['main.js', mainRecord]];
    findTransitiveInitialFiles(metafile, initialFiles, entriesToAnalyze);

    expect(entriesToAnalyze.length).toBe(1);
    expect(initialFiles.has('main.js')).toBeTrue();
    expect(initialFiles.has('polyfills.js')).toBeTrue();
    expect(initialFiles.has('chunk-main.js')).toBeTrue();
    expect(initialFiles.has('chunk-polyfills.js')).toBeFalse();
  });

  it('should filter discovered records using initialFilter when provided', () => {
    const metafile = createMetafile({
      'main.js': {
        imports: [
          { path: 'chunk-a.js', kind: 'import-statement' },
          { path: 'external-lib', kind: 'import-statement', external: true },
        ],
      },
      'chunk-a.js': {
        imports: [{ path: 'chunk-b.js', kind: 'import-statement' }],
      },
      'chunk-b.js': {
        imports: [{ path: 'chunk-c.js', kind: 'import-statement' }],
      },
      'chunk-c.js': {
        imports: [{ path: 'chunk-b.js', kind: 'import-statement' }],
      },
    });

    const initialFiles = new Map<string, InitialFileRecord>([
      ['main.js', { entrypoint: true, name: 'main', type: 'script', serverFile: false, depth: 0 }],
    ]);

    findTransitiveInitialFiles(
      metafile,
      initialFiles,
      undefined,
      (record) => !record.external && record.depth <= 1,
    );

    expect(initialFiles.has('chunk-a.js')).toBeTrue();
    expect(initialFiles.has('external-lib')).toBeFalse();
    expect(initialFiles.has('chunk-b.js')).toBeFalse();
    expect(initialFiles.has('chunk-c.js')).toBeFalse();
  });

  it('should handle circular static imports between chunks without infinite recursion', () => {
    const metafile = createMetafile({
      'main.js': {
        imports: [{ path: 'chunk-a.js', kind: 'import-statement' }],
      },
      'chunk-a.js': {
        imports: [{ path: 'chunk-b.js', kind: 'import-statement' }],
      },
      'chunk-b.js': {
        imports: [
          { path: 'chunk-a.js', kind: 'import-statement' },
          { path: 'main.js', kind: 'import-statement' },
        ],
      },
    });

    const initialFiles = new Map<string, InitialFileRecord>([
      ['main.js', { entrypoint: true, name: 'main', type: 'script', serverFile: false, depth: 0 }],
    ]);

    findTransitiveInitialFiles(metafile, initialFiles);

    expect(initialFiles.get('main.js')?.depth).toBe(0);
    expect(initialFiles.get('chunk-a.js')?.depth).toBe(1);
    expect(initialFiles.get('chunk-b.js')?.depth).toBe(2);
  });

  it('should propagate serverFile flag from entry record to transitive imports', () => {
    const metafile = createMetafile({
      'server.mjs': {
        imports: [{ path: 'chunk-server-1.mjs', kind: 'import-statement' }],
      },
      'chunk-server-1.mjs': {
        imports: [{ path: 'chunk-server-2.mjs', kind: 'import-statement' }],
      },
      'chunk-server-2.mjs': { imports: [] },
    });

    const initialFiles = new Map<string, InitialFileRecord>([
      [
        'server.mjs',
        { entrypoint: true, name: 'server', type: 'script', serverFile: true, depth: 0 },
      ],
    ]);

    findTransitiveInitialFiles(metafile, initialFiles);

    expect(initialFiles.get('chunk-server-1.mjs')).toEqual({
      type: 'script',
      entrypoint: false,
      external: undefined,
      serverFile: true,
      depth: 1,
    });
    expect(initialFiles.get('chunk-server-2.mjs')).toEqual({
      type: 'script',
      entrypoint: false,
      external: undefined,
      serverFile: true,
      depth: 2,
    });
  });
});
