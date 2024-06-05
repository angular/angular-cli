/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview Zone.js requires the `jest` global to be initialized in order to know that it must patch the environment to support Jest
 * execution. When running ESM code, Jest does _not_ inject the global `jest` symbol, so Zone.js would not normally know it is running
 * within Jest as users are supposed to import from `@jest/globals` or use `import.meta.jest`. Zone.js is not currently aware of this, so we
 * manually set this global to get Zone.js to run correctly.
 *
 * TODO(dgp1130): Update Zone.js to directly support Jest ESM executions so we can drop this.
 */

// eslint-disable-next-line no-undef
globalThis.jest = import.meta.jest;
