/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isEsmPackage, rewriteDeferDependencyImports } from './defer-dependency-rewriter';

const DEFER_CODE = `
const App_Defer_2_DepsFn = () => [/* @ts-ignore */
    import("ngx-markdown").then(m => m.MarkdownComponent)];
`;

describe('rewriteDeferDependencyImports', () => {
  it('rewrites a match when the target is treated as ESM', () => {
    const result = rewriteDeferDependencyImports(DEFER_CODE, 'app.js', () => true);

    expect(result).toBeDefined();
    expect(result?.code).toContain('angular:defer-dep:ngx-markdown:MarkdownComponent');
    expect(result?.code).not.toContain('import("ngx-markdown")');
  });

  it('leaves the code untouched when the target is not treated as ESM', () => {
    // This is the lodash case: rewriting a CommonJS import doesn't help,
    // because esbuild bundles a CJS module as one single object no matter
    // what you import from it. So we'd rather do nothing than add an
    // extra step for no benefit.
    const result = rewriteDeferDependencyImports(DEFER_CODE, 'app.js', () => false);

    expect(result).toBeUndefined();
  });

  it('returns undefined when there is nothing to rewrite', () => {
    const result = rewriteDeferDependencyImports('const x = 1;', 'app.js', () => true);

    expect(result).toBeUndefined();
  });

  it('rewrites a default-import dependency', () => {
    const code = `const fn = () => [/* @ts-ignore */\n  import("clsx").then(m => m.default)];`;

    const result = rewriteDeferDependencyImports(code, 'app.js', () => true);

    expect(result?.code).toContain('angular:defer-dep:clsx:default');
  });

  it('produces a source map that covers the rewritten file', () => {
    const result = rewriteDeferDependencyImports(DEFER_CODE, 'app.js', () => true);

    expect(result).toBeDefined();
    const map = result?.map;
    expect(map?.sources).toEqual(['app.js']);
    // We asked for includeContent: true so the original source travels
    // with the map, instead of devtools having to go fetch app.js on its own.
    expect(map?.sourcesContent?.[0]).toBe(DEFER_CODE);
    expect(map?.mappings.length).toBeGreaterThan(0);
  });

  it('does not touch unrelated lines, only the rewritten import call', () => {
    const code = `const before = 1;\n${DEFER_CODE}\nconst after = 2;\n`;

    const result = rewriteDeferDependencyImports(code, 'app.js', () => true);

    expect(result?.code).toContain('const before = 1;');
    expect(result?.code).toContain('const after = 2;');
  });
});

describe('isEsmPackage', () => {
  let tmpDir: string;

  function writePackage(name: string, packageJson: Record<string, unknown>): void {
    const dir = path.join(tmpDir, 'node_modules', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(packageJson));
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'defer-dep-esm-check-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('treats a CommonJS-only package (like lodash) as not ESM', () => {
    writePackage('lodash', { name: 'lodash', main: 'lodash.js' });

    expect(isEsmPackage('lodash', tmpDir)).toBeFalse();
  });

  it('treats "type": "module" as ESM', () => {
    writePackage('a-lib', { name: 'a-lib', type: 'module', main: 'index.js' });

    expect(isEsmPackage('a-lib', tmpDir)).toBeTrue();
  });

  it('treats a "module" field as ESM (the ngx-markdown shape)', () => {
    writePackage('ngx-markdown', {
      name: 'ngx-markdown',
      main: 'bundles/ngx-markdown.umd.js',
      module: 'fesm2022/ngx-markdown.mjs',
      sideEffects: false,
    });

    expect(isEsmPackage('ngx-markdown', tmpDir)).toBeTrue();
  });

  it('treats an "import" condition in "exports" as ESM (the clsx shape)', () => {
    writePackage('clsx', {
      name: 'clsx',
      main: 'dist/clsx.js',
      exports: { '.': { import: './dist/clsx.mjs', default: './dist/clsx.js' } },
    });

    expect(isEsmPackage('clsx', tmpDir)).toBeTrue();
  });

  it('defaults to false when the package cannot be found', () => {
    // If we can't find the package, play it safe and skip the rewrite
    // instead of assuming it's fine.
    expect(isEsmPackage('does-not-exist', tmpDir)).toBeFalse();
  });

  it('resolves a scoped package name correctly', () => {
    const dir = path.join(tmpDir, 'node_modules', '@scope', 'pkg');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: '@scope/pkg', type: 'module' }),
    );

    expect(isEsmPackage('@scope/pkg/subpath', tmpDir)).toBeTrue();
  });

  it('walks up parent directories to find node_modules', () => {
    writePackage('a-lib', { name: 'a-lib', type: 'module' });
    const nestedDir = path.join(tmpDir, 'src', 'app');
    fs.mkdirSync(nestedDir, { recursive: true });

    expect(isEsmPackage('a-lib', nestedDir)).toBeTrue();
  });
});
