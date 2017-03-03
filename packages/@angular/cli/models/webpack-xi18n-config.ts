import * as path from 'path';

import {CliConfig} from './config';
import {NgCliWebpackConfig} from './webpack-config';
const webpackMerge = require('webpack-merge');
import {getWebpackExtractI18nConfig} from './webpack-configs';

export interface XI18WebpackOptions {
  genDir?: string;
  buildDir?: string;
  i18nFormat?: string;
  locale?: string;
  outFile?: string;
  verbose?: boolean;
  progress?: boolean;
  app?: string;
}
export class XI18nWebpackConfig extends NgCliWebpackConfig {

  public config: any;

  constructor(public extractOptions: XI18WebpackOptions, public appConfig: any) {

    super({
      target: 'development',
      verbose: extractOptions.verbose,
      progress: extractOptions.progress
    }, appConfig);
    super.buildConfig();
  }

  public buildConfig() {
    const configPath = CliConfig.configFilePath();
    const projectRoot = path.dirname(configPath);

    const extractI18nConfig =
      getWebpackExtractI18nConfig(projectRoot,
        this.appConfig,
        this.extractOptions.genDir,
        this.extractOptions.i18nFormat,
        this.extractOptions.locale,
        this.extractOptions.outFile);

    this.config = webpackMerge([this.config, extractI18nConfig]);
    return this.config;
  }
}
