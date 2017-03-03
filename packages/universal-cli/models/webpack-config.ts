import {
  getWebpackAotConfigPartial,
  getWebpackNonAotConfigPartial
} from './webpack-build-typescript';
const webpackMerge = require('webpack-merge');
import { CliConfig } from './config';
import { getWebpackCommonConfig } from './webpack-build-common';
import { getWebpackDevConfigPartial } from './webpack-build-development';
import { getWebpackProdConfigPartial } from './webpack-build-production';
import {
  getWebpackMobileConfigPartial,
  getWebpackMobileProdConfigPartial,
  getWebpackNodeConfig
} from './';
import * as path from 'path';

export class NgCliWebpackConfig {
  // TODO: When webpack2 types are finished lets replace all these any types
  // so this is more maintainable in the future for devs
  public configs: any[] = [];

  constructor(
    public ngCliProject: any,
    public target: string,
    public environment: string,
    outputDir?: string,
    baseHref?: string,
    i18nFile?: string,
    i18nFormat?: string,
    locale?: string,
    isAoT = false,
    sourcemap = true,
    vendorChunk = false,
    verbose = false,
    progress = true
  ) {
    const config: CliConfig = CliConfig.fromProject();
    const appConfig = config.config.apps[0];

    appConfig.outDir = outputDir || appConfig.outDir;

    if (appConfig.universal === true && isAoT === true) {
      console.warn('For now, AoT is only supported on client side.');
    }

    let baseConfig = getWebpackCommonConfig(
      this.ngCliProject.root,
      environment,
      appConfig,
      baseHref,
      sourcemap,
      vendorChunk,
      verbose,
      progress
    );
    let targetConfigPartial = this.getTargetConfig(
      this.ngCliProject.root, appConfig, sourcemap, verbose
    );
    const typescriptConfigPartial = isAoT
      ? getWebpackAotConfigPartial(this.ngCliProject.root, appConfig, i18nFile, i18nFormat, locale)
      : getWebpackNonAotConfigPartial(this.ngCliProject.root, appConfig);

    if (appConfig.mobile) {
      let mobileConfigPartial = getWebpackMobileConfigPartial(this.ngCliProject.root, appConfig);
      let mobileProdConfigPartial = getWebpackMobileProdConfigPartial(this.ngCliProject.root,
        appConfig);
      baseConfig = webpackMerge(baseConfig, mobileConfigPartial);
      if (this.target == 'production') {
        targetConfigPartial = webpackMerge(targetConfigPartial, mobileProdConfigPartial);
      }
    }

    if (appConfig.universal === true) {
      const customClientConfig = require(path.join(this.ngCliProject.root,
        appConfig.webpackCustom.client));
      const customServerConfig = require(path.join(this.ngCliProject.root,
        appConfig.webpackCustom.server));

      this.configs.push(webpackMerge(
        baseConfig,
        targetConfigPartial,
        typescriptConfigPartial,
        customClientConfig
      ));

      this.configs.push(webpackMerge(
        getWebpackNonAotConfigPartial(this.ngCliProject.root, appConfig),
        getWebpackNodeConfig(
          this.ngCliProject.root,
          environment,
          appConfig,
          baseHref,
          sourcemap,
          verbose,
          progress),
        customServerConfig
      ));
    } else {
      this.configs.push(webpackMerge(
        baseConfig,
        targetConfigPartial,
        typescriptConfigPartial
      ));
    }
  }

  getTargetConfig(projectRoot: string, appConfig: any, sourcemap: boolean, verbose: boolean): any {
    switch (this.target) {
      case 'development':
        return getWebpackDevConfigPartial(projectRoot, appConfig);
      case 'production':
        return getWebpackProdConfigPartial(projectRoot, appConfig, sourcemap, verbose);
      default:
        throw new Error("Invalid build target. Only 'development' and 'production' are available.");
    }
  }
}
