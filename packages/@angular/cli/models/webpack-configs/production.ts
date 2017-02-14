import * as path from 'path';
import * as webpack from 'webpack';
import * as fs from 'fs';
import { stripIndent } from 'common-tags';
import { StaticAssetPlugin } from '../../plugins/static-asset';
import { GlobCopyWebpackPlugin } from '../../plugins/glob-copy-webpack-plugin';
import { WebpackConfigOptions } from '../webpack-config';


export const getProdConfig = function (wco: WebpackConfigOptions) {
  const { projectRoot, buildOptions, appConfig } = wco;

  let extraPlugins: any[] = [];
  let entryPoints: {[key: string]: string[]} = {};

  if (appConfig.serviceWorker) {
    const nodeModules = path.resolve(projectRoot, 'node_modules');
    const swModule = path.resolve(nodeModules, '@angular/service-worker');

    // @angular/service-worker is required to be installed when serviceWorker is true.
    if (!fs.existsSync(swModule)) {
      throw new Error(stripIndent`
        Your project is configured with serviceWorker = true, but @angular/service-worker
        is not installed. Run \`npm install --save-dev @angular/service-worker\`
        and try again, or run \`ng set apps.0.serviceWorker=false\` in your .angular-cli.json.
      `);
    }

    // Path to the worker script itself.
    const workerPath = path.resolve(swModule, 'bundles/worker-basic.min.js');

    // Path to a small script to register a service worker.
    const registerPath = path.resolve(swModule, 'build/assets/register-basic.min.js');

    // Sanity check - both of these files should be present in @angular/service-worker.
    if (!fs.existsSync(workerPath) || !fs.existsSync(registerPath)) {
      throw new Error(stripIndent`
        The installed version of @angular/service-worker isn't supported by the CLI.
        Please install a supported version. The following files should exist:
        - ${registerPath}
        - ${workerPath}
      `);
    }

    extraPlugins.push(new GlobCopyWebpackPlugin({
      patterns: ['ngsw-manifest.json'],
      globOptions: {
        optional: true,
      },
    }));

    // Load the Webpack plugin for manifest generation and install it.
    const AngularServiceWorkerPlugin = require('@angular/service-worker/build/webpack')
        .AngularServiceWorkerPlugin;
    extraPlugins.push(new AngularServiceWorkerPlugin());

    // Copy the worker script into assets.
    const workerContents = fs.readFileSync(workerPath).toString();
    extraPlugins.push(new StaticAssetPlugin('worker-basic.min.js', workerContents));

    // Add a script to index.html that registers the service worker.
    // TODO(alxhub): inline this script somehow.
    entryPoints['sw-register'] = [registerPath];
  }

  return {
    entry: entryPoints,
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      new (<any>webpack).HashedModuleIdsPlugin(),
      new webpack.optimize.UglifyJsPlugin(<any>{
        mangle: { screw_ie8: true },
        compress: { screw_ie8: true, warnings: buildOptions.verbose },
        sourceMap: buildOptions.sourcemap
      })
    ].concat(extraPlugins)
  };
};
