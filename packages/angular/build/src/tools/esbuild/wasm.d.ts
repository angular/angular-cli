/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/** @fileoverview
 * TypeScript does not provide a separate lib for WASM types and the Node.js
 * types (`@types/node`) does not contain them either. This type definition
 * file provides type information for the subset of functionality required
 * by the Angular build process. Ideally this can be removed when the WASM
 * type situation has improved.
 */

declare namespace WebAssembly {
  class Module {
    constructor(data: Uint8Array);

    static imports(mod: Module): { module: string; name: string }[];
    static exports(mode: Module): { name: string }[];
  }
  function compile(data: Uint8Array): Promise<Module>;
}
