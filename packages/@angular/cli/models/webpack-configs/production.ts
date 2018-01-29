import * as fs from 'fs';
import * as semver from 'semver';
import { stripIndent } from 'common-tags';
import { LicenseWebpackPlugin } from 'license-webpack-plugin';
import { BundleBudgetPlugin } from '../../plugins/bundle-budget';
import { WebpackConfigOptions } from '../webpack-config';
import { resolveProjectModule } from '../../utilities/require-project-module';
import { NEW_SW_VERSION } from '../../utilities/service-worker';



/**
 * license-webpack-plugin has a peer dependency on webpack-sources, list it in a comment to
 * let the dependency validator know it is used.
 *
 * require('webpack-sources')
 */


export function getProdConfig(wco: WebpackConfigOptions) {
  const { projectRoot, buildOptions, appConfig } = wco;

  let extraPlugins: any[] = [];

  if (appConfig.serviceWorker) {
    let swPackageJsonPath;

    try {
      swPackageJsonPath = resolveProjectModule(projectRoot, '@angular/service-worker/package.json');
    } catch (_) {
      // @angular/service-worker is required to be installed when serviceWorker is true.
      throw new Error(stripIndent`
        Your project is configured with serviceWorker = true, but @angular/service-worker
        is not installed. Run \`npm install --save-dev @angular/service-worker\`
        and try again, or run \`ng set apps.0.serviceWorker=false\` in your .angular-cli.json.
      `);
    }

    // Read the version of @angular/service-worker and throw if it doesn't match the
    // expected version.
    const swPackageJson = fs.readFileSync(swPackageJsonPath).toString();
    const swVersion = JSON.parse(swPackageJson)['version'];
    const isModernSw = semver.gte(swVersion, NEW_SW_VERSION);

    if (!isModernSw) {
      throw new Error(stripIndent`
        The installed version of @angular/service-worker is ${swVersion}. This version of the CLI
        requires the @angular/service-worker version to satisfy ${NEW_SW_VERSION}. Please upgrade
        your service worker version.
      `);
    }
  }

  extraPlugins.push(new BundleBudgetPlugin({
    budgets: appConfig.budgets
  }));

  if (buildOptions.extractLicenses) {
    extraPlugins.push(new LicenseWebpackPlugin({
      pattern: /^(MIT|ISC|BSD.*)$/,
      suppressErrors: true,
      perChunkOutput: false,
      outputFilename: `3rdpartylicenses.txt`
    }));
  }

  return {
    plugins: extraPlugins,
  };
}
