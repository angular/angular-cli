/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as esbuild from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDeferDependencyPlugin } from './defer-dependency-plugin';
import { isEsmPackage, rewriteDeferDependencyImports } from './defer-dependency-rewriter';

/**
 * Stands in for the one line we added to compiler-plugin.ts's onLoad
 * handler. This lets the test run the real rewriter and the real plugin
 * together through actual esbuild bundling, without needing to spin up
 * the whole Angular compiler just to get compiled output to test against.
 */
function rewriteOnLoadPlugin(): esbuild.Plugin {
  return {
    name: 'test-rewrite-entry',
    setup(build) {
      build.onLoad({ filter: /entry\.js$/ }, (args) => {
        const contents = fs.readFileSync(args.path, 'utf-8');
        const rewritten = rewriteDeferDependencyImports(contents, args.path, (specifier) =>
          isEsmPackage(specifier, path.dirname(args.path)),
        );

        return { contents: rewritten?.code ?? contents, loader: 'js' };
      });
    },
  };
}

describe('createDeferDependencyPlugin', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'defer-dep-plugin-test-'));

    // A pretend "third-party library": two exports that have nothing to
    // do with each other, sideEffects: false, real ESM. This is the shape
    // that should tree-shake cleanly once nothing is forcing esbuild to
    // keep both of them around.
    const libDir = path.join(tmpDir, 'node_modules', 'fixture-lib');
    fs.mkdirSync(libDir, { recursive: true });
    fs.writeFileSync(
      path.join(libDir, 'package.json'),
      JSON.stringify({ name: 'fixture-lib', type: 'module', main: 'index.js', sideEffects: false }),
    );
    fs.writeFileSync(
      path.join(libDir, 'index.js'),
      [
        'export class Used { greet() { return "USED_MARKER_STRING"; } }',
        'export class Unused { greet() { return "UNUSED_MARKER_STRING"; } }',
      ].join('\n'),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function bundle(entryCode: string, plugins: esbuild.Plugin[]): Promise<string> {
    fs.writeFileSync(path.join(tmpDir, 'entry.js'), entryCode);

    const result = await esbuild.build({
      absWorkingDir: tmpDir,
      entryPoints: [path.join(tmpDir, 'entry.js')],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      plugins,
    });

    return result.outputFiles[0].text;
  }

  const deferEntry = `
const DepsFn = () => [/* @ts-ignore */
    import("fixture-lib").then(m => m.Used)];
export { DepsFn };
`;

  it('drops the unused sibling export once the rewrite plugin is applied', async () => {
    const withoutPlugin = await bundle(deferEntry, []);
    expect(withoutPlugin).toContain('UNUSED_MARKER_STRING');

    const withPlugin = await bundle(deferEntry, [
      rewriteOnLoadPlugin(),
      createDeferDependencyPlugin(),
    ]);
    expect(withPlugin).toContain('USED_MARKER_STRING');
    expect(withPlugin).not.toContain('UNUSED_MARKER_STRING');
  });

  it('does not change output for a plain static import (nothing to rewrite)', async () => {
    const staticEntry = `
import { Used } from 'fixture-lib';
export { Used };
`;
    const output = await bundle(staticEntry, [
      rewriteOnLoadPlugin(),
      createDeferDependencyPlugin(),
    ]);

    expect(output).toContain('USED_MARKER_STRING');
    expect(output).not.toContain('UNUSED_MARKER_STRING');
  });

  it('leaves a Router-style relative lazy import alone', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'lazy.js'),
      'export class FooComponent { greet() { return "LAZY_ROUTE_MARKER"; } }',
    );
    const routeEntry = `
const routes = () => [
  import('./lazy.js').then(m => m.FooComponent),
];
export { routes };
`;

    // Should build and behave exactly as if the plugin weren't there at all.
    const output = await bundle(routeEntry, [rewriteOnLoadPlugin(), createDeferDependencyPlugin()]);
    expect(output).toContain('LAZY_ROUTE_MARKER');
    expect(output).not.toContain('angular:defer-dep');
  });
});
