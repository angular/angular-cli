/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as webpack from 'webpack';

// Webpack 5 transition support types
declare module 'webpack' {
  export namespace compilation {
    export type Chunk = webpack.Chunk;
    export type Compilation = webpack.Compilation;
  }

  export namespace Stats {
    export type ToJsonOutput = webpack.StatsCompilation;
  }
}
