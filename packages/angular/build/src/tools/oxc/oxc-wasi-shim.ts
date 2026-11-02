/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Workaround for an upstream incompatibility in `@oxc-parser/binding-wasm32-wasi` when
// falling back to WebAssembly (e.g., inside WebContainers or StackBlitz).
//
// `@oxc-parser/binding-wasm32-wasi` declares a dependency on `@emnapi/core@2.0.0-alpha.6`,
// but depends on `@napi-rs/wasm-runtime@~1.2.6` which expects `@emnapi/core@>=2.0.0-beta.2`.
// In `@napi-rs/wasm-runtime@1.2.6`, the runtime attempts to assign `initWorker` to
// `emnapi_shared.addonModule`, which is undefined in `alpha.6` where the property was named
// `napiModule`. This results in `TypeError: Cannot set properties of undefined (setting 'initWorker')`,
// causing WASI binding initialization to fail and surface as a misleading "WASI binding not found" error
// or an `ERR_REQUIRE_CYCLE_MODULE` failure.
//
// Aliasing `addonModule` to `this.napiModule` on `Object.prototype` allows the WASI runtime to
// initialize successfully.
//
// See: https://github.com/oxc-project/oxc/issues/28717 and https://github.com/napi-rs/napi-rs/issues/3674
if (
  (globalThis.process?.versions?.['webcontainer'] ||
    globalThis.process?.env?.['NAPI_RS_FORCE_WASI'] === 'true') &&
  !('addonModule' in Object.prototype)
) {
  Object.defineProperty(Object.prototype, 'addonModule', {
    get() {
      return (this as { napiModule?: unknown }).napiModule;
    },
    configurable: true,
    enumerable: false,
  });
}
