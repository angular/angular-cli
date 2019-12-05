/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { isAbsolute } from 'path';
import { Configuration, ContextReplacementPlugin } from 'webpack';
import { WebpackConfigOptions } from '../build-options';
import { getSourceMapDevTool } from './utils';

/**
 * Returns a partial specific to creating a bundle for node
 * @param wco Options which are include the build options and app config
 */
export function getServerConfig(wco: WebpackConfigOptions): Configuration {
  const {
    sourceMap,
    bundleDependencies,
    externalDependencies = [],
  } = wco.buildOptions;

  const extraPlugins = [];
  if (sourceMap) {
    const { scripts, styles, hidden } = sourceMap;
    if (scripts || styles) {
      extraPlugins.push(getSourceMapDevTool(scripts, styles, hidden));
    }
  }

  const config: Configuration = {
    resolve: {
      mainFields: [...(wco.supportES2015 ? ['es2015'] : []), 'main', 'module'],
    },
    target: 'node',
    output: {
      libraryTarget: 'commonjs',
    },
    plugins: [
      // Fixes Critical dependency: the request of a dependency is an expression
      new ContextReplacementPlugin(/@?hapi(\\|\/)/),
      new ContextReplacementPlugin(/express(\\|\/)/),
      ...extraPlugins,
    ],
    node: false,
  };

  if (bundleDependencies) {
    config.externals = [...externalDependencies];
  } else {
    config.externals = [
      ...externalDependencies,
      (context: string, request: string, callback: (error?: null, result?: string) => void) => {
        // Absolute & Relative paths are not externals
        if (request.startsWith('./') || isAbsolute(request)) {
          callback();

          return;
        }

        try {
          require.resolve(request);
          callback(null, request);
        } catch {
          // Node couldn't find it, so it must be user-aliased
          callback();
        }
      },
    ];
  }

  return config;
}
