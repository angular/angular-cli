const webpackMerge = require('webpack-merge');

import { BuildOptions } from './build-options';
import { NgCliWebpackConfig } from './webpack-config';
import {
  getCommonConfig,
  getStylesConfig,
  getNonAotTestConfig,
  getTestConfig
} from './webpack-configs';

export interface WebpackTestOptions extends BuildOptions {
  codeCoverage?: boolean;
}
export class WebpackTestConfig extends NgCliWebpackConfig<WebpackTestOptions> {
  constructor(testOptions: WebpackTestOptions, appConfig: any) {
    super(testOptions, appConfig);
  }

  public buildConfig() {
    const webpackConfigs = [
      getCommonConfig(this.wco),
      getStylesConfig(this.wco),
      this.getTargetConfig(this.wco),
      getNonAotTestConfig(this.wco),
      getTestConfig(this.wco)
    ];

    this.config = webpackMerge(webpackConfigs);

    return this.config;
  }
}
