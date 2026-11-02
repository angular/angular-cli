/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Module, createRequire } from 'node:module';

// Workaround for an upstream incompatibility in `@oxc-parser/binding-wasm32-wasi` when
// falling back to WebAssembly (e.g., inside WebContainers or StackBlitz).
//
// `@oxc-parser/binding-wasm32-wasi` declares a dependency on `@emnapi/core@2.0.0-alpha.6`,
// but depends on `@napi-rs/wasm-runtime@~1.2.6` which expects `@emnapi/core@^1.7.1 || 2.0.0-beta.2`.
// 1. In `@napi-rs/wasm-runtime@1.2.6`, the runtime attempts to assign `initWorker` to
//    `emnapi_shared.addonModule`, which is undefined in `alpha.6` where the property was named
//    `napiModule`. Aliasing `addonModule` to `this.napiModule` on `Object.prototype` allows the
//    WASI runtime to initialize successfully.
// 2. Under npm, `@napi-rs/wasm-runtime@1.2.6`'s peerDependencies cause npm to hoist `@emnapi/core@1.x`
//    to top-level `node_modules` while nesting `2.0.0-alpha.6` under `@oxc-parser/binding-wasm32-wasi`,
//    causing an ABI mismatch (`this.bridge.setLastError is not a function`). Under pnpm, `oxc-parser`
//    does not declare `@oxc-parser/binding-wasm32-wasi` in its own dependencies. Resolving these
//    packages relative to `@angular/build` and `@oxc-parser/binding-wasm32-wasi` ensures consistent
//    module resolution across package managers.
//
// See: https://github.com/oxc-project/oxc/issues/28717 and https://github.com/napi-rs/napi-rs/issues/3674
const forceWasi = globalThis.process?.env?.['NAPI_RS_FORCE_WASI'];
if (
  (globalThis.process?.versions?.['webcontainer'] ||
    forceWasi === 'true' ||
    forceWasi === 'error') &&
  !('addonModule' in Object.prototype)
) {
  Object.defineProperty(Object.prototype, 'addonModule', {
    get() {
      return (this as { napiModule?: unknown }).napiModule;
    },
    set(value) {
      if (this && (typeof this === 'object' || typeof this === 'function')) {
        Object.defineProperty(this, 'addonModule', {
          value,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    },
    configurable: true,
    enumerable: false,
  });

  const resolvedModules = new Map<string, string>();
  try {
    const wasiBindingPath = require.resolve('@oxc-parser/binding-wasm32-wasi');
    resolvedModules.set('@oxc-parser/binding-wasm32-wasi', wasiBindingPath);
    const wasiRequire = createRequire(wasiBindingPath);
    resolvedModules.set('@emnapi/core', wasiRequire.resolve('@emnapi/core'));
    resolvedModules.set('@emnapi/runtime', wasiRequire.resolve('@emnapi/runtime'));
  } catch {}

  if (resolvedModules.size > 0) {
    const moduleWithResolve = Module as typeof Module & {
      _resolveFilename: (
        request: string,
        parent: unknown,
        isMain: boolean,
        options: unknown,
      ) => string;
    };
    const origResolveFilename = moduleWithResolve._resolveFilename;
    moduleWithResolve._resolveFilename = function (request, parent, isMain, options) {
      const resolved = resolvedModules.get(request);
      if (resolved !== undefined) {
        return resolved;
      }

      return origResolveFilename.call(this, request, parent, isMain, options);
    };
  }
}
