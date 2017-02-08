import * as path from 'path';

import {CliConfig} from './config';
import {NgCliWebpackConfig} from './webpack-config';
const webpackMerge = require('webpack-merge');
import {getWebpackExtractI18nConfig} from './webpack-configs';

export interface XI18WebpackOptions {
  genDir?: string;
  buildDir?: string;
  i18nFormat?: string;
  verbose?: boolean;
  progress?: boolean;
}
export class XI18nWebpackConfig extends NgCliWebpackConfig {

  public config: any;

  constructor(extractOptions: XI18WebpackOptions) {

    super({
      target: 'development',
      verbose: extractOptions.verbose,
      progress: extractOptions.progress
    });

    const configPath = CliConfig.configFilePath();
    const projectRoot = path.dirname(configPath);
    const appConfig = CliConfig.fromProject().config.apps[0];

    const extractI18nConfig =
      getWebpackExtractI18nConfig(projectRoot,
        appConfig,
        extractOptions.genDir,
        extractOptions.i18nFormat);

    this.config = webpackMerge([this.config, extractI18nConfig]);
  }
}
