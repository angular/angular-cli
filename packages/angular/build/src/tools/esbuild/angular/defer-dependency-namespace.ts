/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * A made-up module name esbuild lets us use. We rewrite a `@defer` import
 * to point at this instead of the real package, so we can hand esbuild a
 * clean, static re-export instead of a dynamic `import()`.
 *
 * Both the rewriter (which builds these fake import paths) and the plugin
 * (which reads them back apart) use this same constant, so they can't
 * accidentally get out of sync.
 */
export const DEFER_DEPENDENCY_NAMESPACE = 'angular:defer-dep';

/**
 * Packs a package name and an export name into one string that can be
 * used as an import path, e.g. `angular:defer-dep:some-lib:SomeComponent`.
 *
 * We can't just join the two with `:` and split on `:` later, because the
 * namespace above already has a `:` in it. `encodeURIComponent` keeps
 * everything safe to pull back apart in `decodeDeferDependencySpecifier`
 * below, no matter what characters show up in a real package or export
 * name.
 */
export function encodeDeferDependencySpecifier(specifier: string, symbol: string): string {
  return `${DEFER_DEPENDENCY_NAMESPACE}:${encodeURIComponent(specifier)}:${encodeURIComponent(symbol)}`;
}

export function decodeDeferDependencySpecifier(virtualSpecifier: string): {
  specifier: string;
  symbol: string;
} {
  const [specifierEnc, symbolEnc] = virtualSpecifier
    .slice(DEFER_DEPENDENCY_NAMESPACE.length + 1)
    .split(':');

  return {
    specifier: decodeURIComponent(specifierEnc),
    symbol: decodeURIComponent(symbolEnc),
  };
}
