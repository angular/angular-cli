/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as webpack from 'webpack';
import { loader as webpack4Loader } from '@types/webpack';

// Webpack 5 transition support types
declare module 'webpack' {
  export interface Configuration extends webpack.Configuration {
    devServer?: import('webpack-dev-server').Configuration;
  }

  export namespace sources {
    export class RawSource extends webpack.sources.RawSource {
      constructor(source: string);
    }
    export class SourceMapSource extends webpack.sources.SourceMapSource {
      constructor(
        source: string,
        name: string,
        sourceMap: string,
        originalSource: string,
        innerSourceMap: string,
      );
    }
  }

  export namespace compilation {
    export type Compilation = webpack.Compilation;
    export type Module = webpack.Module;
  }

  export namespace loader {
    export type LoaderContext = webpack4Loader.LoaderContext;
  }
}
