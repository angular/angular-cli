/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export * from './angular_compiler_plugin';
export * from './interfaces';
export { ngcLoader as default } from './loader';

export const NgToolsLoader = __filename;

// We shouldn't need to export this, but webpack-rollup-loader uses it.
export type { VirtualFileSystemDecorator } from './virtual_file_system_decorator';

export * as ivy from './ivy';
