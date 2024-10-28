/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// The `bundled_beasties` causes issues with module mappings in Bazel,
// leading to unexpected behavior with esbuild. Specifically, the problem occurs
// when esbuild resolves to a different module or version than expected, due to
// how Bazel handles module mappings.
//
// This change aims to resolve esbuild types correctly and maintain consistency
// in the Bazel build process.

declare module 'esbuild' {
  export * from 'esbuild-wasm';
}

/**
 * Augment the Node.js module builtin types to support the v22.8+ compile cache functions
 */
declare module 'node:module' {
  function getCompileCacheDir(): string | undefined;
}
