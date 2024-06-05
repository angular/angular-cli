/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable import/no-extraneous-dependencies */
// Workaround for https://github.com/bazelbuild/rules_nodejs/issues/1033
// Alternative approach instead of https://github.com/angular/angular/pull/33226
declare module '@yarnpkg/lockfile' {
  export * from '@types/yarnpkg__lockfile';
}
