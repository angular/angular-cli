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
  experimentalAngularCompiler?: boolean;
}
export class XI18nWebpackConfig extends NgCliWebpackConfig {

  public config: any;

  constructor(public extractOptions: XI18WebpackOptions, public appConfig: any) {

    super({
      target: 'development',
      verbose: extractOptions.verbose,
      progress: extractOptions.progress,
      experimentalAngularCompiler: extractOptions.experimentalAngularCompiler,
      locale: extractOptions.locale,
      i18nOutFormat: extractOptions.i18nFormat,
      i18nOutFile: extractOptions.outFile,
      aot: extractOptions.experimentalAngularCompiler
    }, appConfig);
    super.buildConfig();
  }

  public buildConfig() {
    // The extra extraction config is only needed in Angular 2/4.
    if (!this.extractOptions.experimentalAngularCompiler) {
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
    }
    return this.config;
  }
}
