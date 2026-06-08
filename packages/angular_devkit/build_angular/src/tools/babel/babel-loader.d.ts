/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

declare module 'babel-loader' {
  type BabelLoaderCustomizer<T> = (babel: typeof import('@babel/core')) => {
    customOptions?(
      this: import('webpack').loader.LoaderContext,
      loaderOptions: Record<string, unknown>,
      loaderArguments: { source: string; map?: unknown },
    ): Promise<{ custom?: T; loader: Record<string, unknown> }>;
    config?(
      this: import('webpack').loader.LoaderContext,
      configuration: import('@babel/core').PartialConfig,
      loaderArguments: { source: string; map?: unknown; customOptions: T },
    ): import('@babel/core').TransformOptions;
    result?(
      this: import('webpack').loader.LoaderContext,
      result: import('@babel/core').BabelFileResult,
      context: {
        source: string;
        map?: unknown;
        customOptions: T;
        configuration: import('@babel/core').PartialConfig;
        options: import('@babel/core').TransformOptions;
      },
    ): import('@babel/core').BabelFileResult;
  };
  function custom<T>(customizer: BabelLoaderCustomizer<T>): import('webpack').loader.Loader;
}
