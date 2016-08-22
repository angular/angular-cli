import * as path from 'path';
import * as fs from 'fs';
import * as webpackMerge from 'webpack-merge';
import { CliConfig } from './config';
import {
  getWebpackCommonConfig,
  getWebpackDevConfigPartial,
  getWebpackProdConfigPartial,
  getWebpackMobileConfigPartial,
  getWebpackMobileProdConfigPartial
} from './';

export class NgCliWebpackConfig {
  // TODO: When webpack2 types are finished lets replace all these any types
  // so this is more maintainable in the future for devs
  public config: any;
  private webpackDevConfigPartial: any;
  private webpackProdConfigPartial: any;
  private webpackBaseConfig: any;
  private webpackMobileConfigPartial: any;
  private webpackMobileProdConfigPartial: any;

  constructor(public ngCliProject: any, public target: string, public environment: string, outputDir?: string) {
    const appConfig = CliConfig.fromProject().apps[0];

    appConfig.outDir = outputDir || appConfig.outDir; 

    this.webpackBaseConfig = getWebpackCommonConfig(this.ngCliProject.root, environment, appConfig);
    this.webpackDevConfigPartial = getWebpackDevConfigPartial(this.ngCliProject.root, appConfig);
    this.webpackProdConfigPartial = getWebpackProdConfigPartial(this.ngCliProject.root, appConfig);

    if (CliConfig.fromProject().apps[0].mobile){
      this.webpackMobileConfigPartial = getWebpackMobileConfigPartial(this.ngCliProject.root, appConfig);
      this.webpackMobileProdConfigPartial = getWebpackMobileProdConfigPartial(this.ngCliProject.root, appConfig);
      this.webpackBaseConfig = webpackMerge(this.webpackBaseConfig, this.webpackMobileConfigPartial);
      this.webpackProdConfigPartial = webpackMerge(this.webpackProdConfigPartial, this.webpackMobileProdConfigPartial);
    }

    this.generateConfig();
  }

  generateConfig(): void {
    switch (this.target) {
      case "development":
        this.config = webpackMerge(this.webpackBaseConfig, this.webpackDevConfigPartial);
        break;
      case "production":
        this.config = webpackMerge(this.webpackBaseConfig, this.webpackProdConfigPartial);
        break;
      default:
        throw new Error("Invalid build target. Only 'development' and 'production' are available.");
        break;
    }
  }
}
