import * as path from 'path';
import * as webpack from 'webpack';
import * as fs from 'fs';
import * as semver from 'semver';
import { stripIndent } from 'common-tags';
import { PurifyPlugin } from '@angular-devkit/build-optimizer';
import { StaticAssetPlugin } from '../../plugins/static-asset';
import { GlobCopyWebpackPlugin } from '../../plugins/glob-copy-webpack-plugin';
import { WebpackConfigOptions } from '../webpack-config';

const licensePlugin = require('license-webpack-plugin');

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

    // Read the version of @angular/service-worker and throw if it doesn't match the
    // expected version.
    const allowedVersion = '>= 1.0.0-beta.5 < 2.0.0';
    const swPackageJson = fs.readFileSync(`${swModule}/package.json`).toString();
    const swVersion = JSON.parse(swPackageJson)['version'];
    if (!semver.satisfies(swVersion, allowedVersion)) {
      throw new Error(stripIndent`
        The installed version of @angular/service-worker is ${swVersion}. This version of the CLI
        requires the @angular/service-worker version to satisfy ${allowedVersion}. Please upgrade
        your service worker version.
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
      patterns: [
        'ngsw-manifest.json',
        {glob: 'ngsw-manifest.json', input: path.resolve(projectRoot, appConfig.root), output: ''}
      ],
      globOptions: {
        cwd: projectRoot,
        optional: true,
      },
    }));

    // Load the Webpack plugin for manifest generation and install it.
    const AngularServiceWorkerPlugin = require('@angular/service-worker/build/webpack')
        .AngularServiceWorkerPlugin;
    extraPlugins.push(new AngularServiceWorkerPlugin({
      baseHref: buildOptions.baseHref || '/',
    }));

    // Copy the worker script into assets.
    const workerContents = fs.readFileSync(workerPath).toString();
    extraPlugins.push(new StaticAssetPlugin('worker-basic.min.js', workerContents));

    // Add a script to index.html that registers the service worker.
    // TODO(alxhub): inline this script somehow.
    entryPoints['sw-register'] = [registerPath];
  }

  if (buildOptions.extractLicenses) {
    extraPlugins.push(new licensePlugin({
      pattern: /^(MIT|ISC|BSD.*)$/,
      suppressErrors: true
    }));
  }

  const uglifyCompressOptions: any = { screw_ie8: true, warnings: buildOptions.verbose };

  if (buildOptions.buildOptimizer) {
    // This plugin must be before webpack.optimize.UglifyJsPlugin.
    extraPlugins.push(new PurifyPlugin());
    uglifyCompressOptions.pure_getters = true;
  }

  return {
    entry: entryPoints,
    plugins: extraPlugins.concat([
      new webpack.EnvironmentPlugin({
        'NODE_ENV': 'production'
      }),
      new webpack.HashedModuleIdsPlugin(),
      new webpack.optimize.ModuleConcatenationPlugin(),
      new webpack.optimize.UglifyJsPlugin(<any>{
        mangle: { screw_ie8: true },
        compress: uglifyCompressOptions,
        sourceMap: buildOptions.sourcemaps,
        comments: false
      })
    ])
  };
};
