import * as path from 'path';
import * as glob from 'glob';
import * as webpack from 'webpack';

import { CliConfig } from '../config';
import { WebpackTestOptions } from '../webpack-test-config';
import { WebpackConfigOptions } from '../webpack-config';


/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('istanbul-instrumenter-loader')
 *
 */


export function getTestConfig(wco: WebpackConfigOptions<WebpackTestOptions>) {
  const { projectRoot, buildOptions, appConfig } = wco;

  const nodeModules = path.resolve(projectRoot, 'node_modules');
  const extraRules: any[] = [];
  const extraPlugins: any[] = [];

  if (buildOptions.codeCoverage && CliConfig.fromProject()) {
    const codeCoverageExclude = CliConfig.fromProject().get('test.codeCoverage.exclude');
    let exclude: (string | RegExp)[] = [
      /\.(e2e|spec)\.ts$/,
      /node_modules/
    ];

    if (codeCoverageExclude) {
      codeCoverageExclude.forEach((excludeGlob: string) => {
        const excludeFiles = glob
          .sync(path.join(projectRoot, excludeGlob), { nodir: true })
          .map(file => path.normalize(file));
        exclude.push(...excludeFiles);
      });
    }

    extraRules.push({
      test: /\.(js|ts)$/, loader: 'istanbul-instrumenter-loader',
      options: { esModules: true },
      enforce: 'post',
      exclude
    });
  }

  return {
    resolve: {
      mainFields: [
        ...(wco.supportES2015 ? ['es2015'] : []),
        'browser', 'module', 'main'
      ]
    },
    devtool: buildOptions.sourcemaps ? 'inline-source-map' : 'eval',
    entry: {
      main: path.resolve(projectRoot, appConfig.root, appConfig.test)
    },
    module: {
      rules: [].concat(extraRules)
    },
    plugins: [
      new webpack.optimize.CommonsChunkPlugin({
        minChunks: Infinity,
        name: 'inline'
      }),
      new webpack.optimize.CommonsChunkPlugin({
        name: 'vendor',
        chunks: ['main'],
        minChunks: (module: any) => module.resource && module.resource.startsWith(nodeModules)
      })
    ].concat(extraPlugins)
  };
}
