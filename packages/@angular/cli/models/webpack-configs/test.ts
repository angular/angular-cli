import * as path from 'path';
import * as webpack from 'webpack';

import { CliConfig } from '../config';
import { WebpackTestOptions } from '../webpack-test-config';

/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('istanbul-instrumenter-loader')
 *
 */


export function getTestConfig(testConfig: WebpackTestOptions) {

  const configPath = CliConfig.configFilePath();
  const projectRoot = path.dirname(configPath);
  const appConfig = CliConfig.fromProject().config.apps[0];
  const extraRules: any[] = [];

  if (testConfig.codeCoverage) {
    extraRules.push({
      test: /\.(js|ts)$/, loader: 'istanbul-instrumenter-loader',
      enforce: 'post',
      exclude: [
        /\.(e2e|spec)\.ts$/,
        /node_modules/
      ]
    });
  }

  return {
    devtool: testConfig.sourcemap ? 'inline-source-map' : 'eval',
    entry: {
      test: path.resolve(projectRoot, appConfig.root, appConfig.test)
    },
    module: {
      rules: [].concat(extraRules)
    },
    plugins: [
      new webpack.SourceMapDevToolPlugin({
        filename: null, // if no value is provided the sourcemap is inlined
        test: /\.(ts|js)($|\?)/i // process .js and .ts files only
      })
    ]
  };
}
