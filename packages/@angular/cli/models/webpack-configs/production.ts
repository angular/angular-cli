import * as path from 'path';
import * as webpack from 'webpack';
import * as fs from 'fs';
import * as semver from 'semver';
import { stripIndent } from 'common-tags';
import { LicenseWebpackPlugin } from 'license-webpack-plugin';
import { PurifyPlugin } from '@angular-devkit/build-optimizer';
import { StaticAssetPlugin } from '../../plugins/static-asset';
import { GlobCopyWebpackPlugin } from '../../plugins/glob-copy-webpack-plugin';
import { WebpackConfigOptions } from '../webpack-config';
import { NEW_SW_VERSION } from '../../utilities/service-worker';

const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const OLD_SW_VERSION = '>= 1.0.0-beta.5 < 2.0.0';

/**
 * license-webpack-plugin has a peer dependency on webpack-sources, list it in a comment to
 * let the dependency validator know it is used.
 *
 * require('webpack-sources')
 */


export function getProdConfig(wco: WebpackConfigOptions) {
  const { projectRoot, buildOptions, appConfig } = wco;

  let extraPlugins: any[] = [];
  let entryPoints: { [key: string]: string[] } = {};

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
    const swPackageJson = fs.readFileSync(`${swModule}/package.json`).toString();
    const swVersion = JSON.parse(swPackageJson)['version'];

    const isLegacySw = semver.satisfies(swVersion, OLD_SW_VERSION);
    const isModernSw = semver.gte(swVersion, NEW_SW_VERSION);

    if (!isLegacySw && !isModernSw) {
      throw new Error(stripIndent`
        The installed version of @angular/service-worker is ${swVersion}. This version of the CLI
        requires the @angular/service-worker version to satisfy ${OLD_SW_VERSION}. Please upgrade
        your service worker version.
      `);
    }

    if (isLegacySw) {
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

      // CopyWebpackPlugin replaces GlobCopyWebpackPlugin, but AngularServiceWorkerPlugin depends
      // on specific behaviour from latter.
      // AngularServiceWorkerPlugin expects the ngsw-manifest.json to be present in the 'emit' phase
      // but with CopyWebpackPlugin it's only there on 'after-emit'.
      // So for now we keep it here, but if AngularServiceWorkerPlugin changes we remove it.
      extraPlugins.push(new GlobCopyWebpackPlugin({
        patterns: [
          'ngsw-manifest.json',
          { glob: 'ngsw-manifest.json',
            input: path.resolve(projectRoot, appConfig.root), output: '' }
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
  }

  if (buildOptions.extractLicenses) {
    extraPlugins.push(new LicenseWebpackPlugin({
      pattern: /^(MIT|ISC|BSD.*)$/,
      suppressErrors: true,
      perChunkOutput: false,
      outputFilename: `3rdpartylicenses.txt`
    }));
  }

  const uglifyCompressOptions: any = {
    // Disabled because of an issue with Mapbox GL when using the Webpack node global and UglifyJS:
    // https://github.com/mapbox/mapbox-gl-js/issues/4359#issuecomment-303880888
    // https://github.com/angular/angular-cli/issues/5804
    // https://github.com/angular/angular-cli/pull/7931
    typeofs : false
  };

  if (buildOptions.buildOptimizer) {
    // This plugin must be before webpack.optimize.UglifyJsPlugin.
    extraPlugins.push(new PurifyPlugin());
    uglifyCompressOptions.pure_getters = true;
    // PURE comments work best with 3 passes.
    // See https://github.com/webpack/webpack/issues/2899#issuecomment-317425926.
    uglifyCompressOptions.passes = 3;
  }

  return {
    entry: entryPoints,
    plugins: [
      new webpack.EnvironmentPlugin({
        'NODE_ENV': 'production'
      }),
      new webpack.HashedModuleIdsPlugin(),
      new webpack.optimize.ModuleConcatenationPlugin(),
      ...extraPlugins,
      // Uglify should be the last plugin as PurifyPlugin needs to be before it.
      new UglifyJSPlugin({
        sourceMap: buildOptions.sourcemaps,
        uglifyOptions: {
          ecma: wco.supportES2015 ? 6 : 5,
          warnings: buildOptions.verbose,
          ie8: false,
          mangle: {
            safari10: true,
          },
          compress: uglifyCompressOptions,
          output: {
            ascii_only: true,
            comments: false,
            webkit: true,
          },
        }
      }),
    ]
  };
}
