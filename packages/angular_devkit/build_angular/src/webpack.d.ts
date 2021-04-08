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

  export namespace loader {
    export type LoaderContext = webpack4Loader.LoaderContext;
  }
}
