import {CliConfig} from './config';
import {NgCliWebpackConfig} from './webpack-config';
const webpackMerge = require('webpack-merge');
import {getWebpackExtractI18nConfig} from './webpack-extract-i18n';

export class XI18nWebpackConfig extends NgCliWebpackConfig {

  public config: any;

  constructor(
    ngCliProject: any,
    genDir: string,
    buildDir: string,
    i18nFormat: string,
    verbose: boolean = false, progress: boolean = true) {
    super(
      ngCliProject,
      'development',
      'dev',
      buildDir,
      null,
      null,
      null,
      null,
      false,
      true,
      true,
      verbose,
      progress,
      null,
      'none',
      true);

    const appConfig = CliConfig.fromProject().config.apps[0];

    let config = this.config;
    const extractI18nConfig =
      getWebpackExtractI18nConfig(this.ngCliProject.root, appConfig, genDir, i18nFormat);
    config = webpackMerge(config, extractI18nConfig);

    this.config = config;
  }
}
