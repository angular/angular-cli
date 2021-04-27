/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// Workaround for https://github.com/bazelbuild/rules_nodejs/issues/1033
// Alternative approach instead of https://github.com/angular/angular/pull/33226
declare module '@babel/core' {
  export * from '@types/babel__core';
}
declare module '@babel/generator' {
  export { default } from '@types/babel__generator';
}
declare module '@babel/traverse' {
  export { default } from '@types/babel__traverse';
}
declare module '@babel/template' {
  export { default } from '@types/babel__template';
}
