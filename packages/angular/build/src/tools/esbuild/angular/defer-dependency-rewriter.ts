/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import MagicString, { type SourceMap } from 'magic-string';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { findDeferDependencyImports } from './defer-dependency-detector';
import { encodeDeferDependencySpecifier } from './defer-dependency-namespace';

/** What a successful rewrite gives back: the new code, plus a source map for it. */
export interface DeferDependencyRewriteResult {
  code: string;
  map: SourceMap;
}

/**
 * Rewrites `@defer`-generated dependency imports so they go through our
 * `angular:defer-dep` virtual module instead of importing the package
 * directly. That's what lets esbuild tree-shake away the parts of the
 * package nothing actually uses.
 *
 * Returns `undefined` if there was nothing to change - either because we
 * didn't find anything to rewrite, or because we found something but
 * decided it wasn't worth rewriting (see `isEsmPackage` below).
 */
export function rewriteDeferDependencyImports(
  code: string,
  fileName: string,
  isEsmPackage: (specifier: string) => boolean,
): DeferDependencyRewriteResult | undefined {
  const matches = findDeferDependencyImports(code, fileName).filter((match) =>
    isEsmPackage(match.specifier),
  );

  if (matches.length === 0) {
    return undefined;
  }

  const magicString = new MagicString(code);
  for (const match of matches) {
    const virtualSpecifier = encodeDeferDependencySpecifier(match.specifier, match.symbol);
    magicString.overwrite(match.start, match.end, JSON.stringify(virtualSpecifier));
  }

  return {
    code: magicString.toString(),
    map: magicString.generateMap({ source: fileName, includeContent: true, hires: true }),
  };
}

/**
 * Decides if a package is worth rewriting at all.
 *
 * Short version: this trick only helps for ESM packages. A CommonJS
 * package gets bundled by esbuild as one single object, no matter which
 * property you read off it - so rewriting the import doesn't unlock any
 * tree-shaking there, it just adds an extra hop for nothing. We checked
 * this against a real package (`lodash`): after rewriting, the bundle got
 * *bigger*, not smaller.
 *
 * To find out, we walk up the folders looking for the target package's
 * `package.json`, and check it for the same clues esbuild's own resolver
 * looks for to know if a package ships real ESM: a `"type": "module"`
 * field, a `"module"` field, or an `"import"` entry inside `"exports"`.
 *
 * If we can't find the package.json at all, we say "not ESM" and skip the
 * rewrite. When we're not sure, doing nothing is always safe - rewriting
 * something we're unsure about is not.
 */
export function isEsmPackage(specifier: string, resolveDir: string): boolean {
  const packageName = specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : specifier.split('/')[0];

  let dir = resolveDir;
  for (let i = 0; i < 10; i++) {
    const packageJsonPath = path.join(dir, 'node_modules', packageName, 'package.json');
    if (existsSync(packageJsonPath)) {
      let packageJson: { type?: string; module?: string; exports?: unknown };
      try {
        packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      } catch {
        return false;
      }

      if (packageJson.type === 'module' || packageJson.module) {
        return true;
      }

      // Not a full, proper check of the "exports" field - just a simple
      // one. If the word "import" shows up anywhere in there, the package
      // has some kind of real ESM entry point.
      return !!packageJson.exports && JSON.stringify(packageJson.exports).includes('"import"');
    }

    const parentDir = path.dirname(dir);
    if (parentDir === dir) {
      break;
    }
    dir = parentDir;
  }

  return false;
}
