/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as webpack from 'webpack';
import { Compiler as webpack4Compiler } from '@types/webpack';

// Webpack 5 transition support types
declare module 'webpack' {
  export type WebpackFourCompiler = webpack4Compiler;
}
