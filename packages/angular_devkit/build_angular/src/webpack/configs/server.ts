/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { isAbsolute } from 'path';
import { Configuration, ContextReplacementPlugin } from 'webpack';
import { WebpackConfigOptions } from '../../utils/build-options';
import { getSourceMapDevTool } from '../utils/helpers';

/**
 * Returns a partial Webpack configuration specific to creating a bundle for node
 * @param wco Options which include the build options and app config
 */
export function getServerConfig(wco: WebpackConfigOptions): Configuration {
  const { sourceMap, bundleDependencies, externalDependencies = [] } = wco.buildOptions;

  const extraPlugins = [];
  const { scripts, styles, hidden } = sourceMap;
  if (scripts || styles) {
    extraPlugins.push(getSourceMapDevTool(scripts, styles, hidden));
  }

  const externals: Configuration['externals'] = [...externalDependencies];
  if (!bundleDependencies) {
    externals.push(({ context, request }, callback) =>
      externalizePackages(context ?? wco.projectRoot, request, callback),
    );
  }

  return {
    resolve: {
      mainFields: ['es2020', 'es2015', 'main', 'module'],
    },
    output: {
      libraryTarget: 'commonjs',
    },
    module: {
      parser: {
        javascript: {
          worker: false,
          url: false,
        },
      },
    },
    plugins: [
      // Fixes Critical dependency: the request of a dependency is an expression
      new ContextReplacementPlugin(/@?hapi(\\|\/)/),
      new ContextReplacementPlugin(/express(\\|\/)/),
      ...extraPlugins,
    ],
    node: false,
    externals,
  };
}

function externalizePackages(
  context: string,
  request: string | undefined,
  callback: (error?: Error, result?: string) => void,
): void {
  if (!request) {
    return;
  }

  // Absolute & Relative paths are not externals
  if (request.startsWith('.') || isAbsolute(request)) {
    callback();

    return;
  }

  try {
    require.resolve(request, { paths: [context] });
    callback(undefined, request);
  } catch {
    // Node couldn't find it, so it must be user-aliased
    callback();
  }
}
