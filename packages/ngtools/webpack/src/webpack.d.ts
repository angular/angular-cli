/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as webpack from 'webpack';
import { Compiler as webpack4Compiler, loader as webpack4Loader } from '@types/webpack';

// Webpack 5 transition support types
declare module 'webpack' {
  export type WebpackFourCompiler = webpack4Compiler;

  export type InputFileSystem = webpack.Compiler['inputFileSystem'];

  export namespace compilation {
    export type Compilation = webpack.Compilation;
    export type Module = webpack.Module;
  }

  export namespace loader {
    export type LoaderContext = webpack4Loader.LoaderContext;
  }
}
