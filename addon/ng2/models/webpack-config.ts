import * as path from 'path';
import * as fs from 'fs';
import * as webpackMerge from 'webpack-merge';
import * as AssetsPlugin from 'assets-webpack-plugin';
import { HtmlCliPlugin } from '../utilities/html-cli-plugin';
import { CliConfig } from './config';
import { NgCliEnvironmentPlugin } from '../utilities/environment-plugin';
import {
  getWebpackCommonConfig,
  getWebpackDevConfigPartial,
  getWebpackProdConfigPartial,
  getWebpackMobileConfigPartial,
  getWebpackMobileProdConfigPartial
  getWebpackCSSConfig
} from './';

export class NgCliWebpackConfig {
  // TODO: When webpack2 types are finished lets replace all these any types
  // so this is more maintainable in the future for devs
  public config: any;
  private webpackDevConfigPartial: any;
  private webpackProdConfigPartial: any;
  private webpackBaseConfig: any;
  private webpackMaterialConfig: any;
  private webpackMaterialE2EConfig: any;
  private webpackMobileConfigPartial: any;
  private webpackMobileProdConfigPartial: any;
  private webpackCSSConfig: any;

  constructor(public ngCliProject: any, public target: string, public environment: string) {
    const sourceDir = CliConfig.fromProject().defaults.sourceDir;

    const environmentPath = `./${sourceDir}/app/environments/environment.${environment}.ts`;

    this.webpackBaseConfig = getWebpackCommonConfig(this.ngCliProject.root, sourceDir);
    this.webpackDevConfigPartial = getWebpackDevConfigPartial(this.ngCliProject.root, sourceDir);
    this.webpackProdConfigPartial = getWebpackProdConfigPartial(this.ngCliProject.root, sourceDir);
    this.webpackCSSConfig = getWebpackCSSConfig(this.ngCliProject.root, sourceDir);

    if (CliConfig.fromProject().apps[0].mobile){
      this.webpackMobileConfigPartial = getWebpackMobileConfigPartial(this.ngCliProject.root, sourceDir);
      this.webpackMobileProdConfigPartial = getWebpackMobileProdConfigPartial(this.ngCliProject.root, sourceDir);
      this.webpackBaseConfig = webpackMerge(this.webpackBaseConfig, this.webpackMobileConfigPartial);
      this.webpackProdConfigPartial = webpackMerge(this.webpackProdConfigPartial, this.webpackMobileProdConfigPartial);
    }

    this.generateConfig();
    this.config[0].plugins.unshift(new NgCliEnvironmentPlugin({
      path: path.resolve(this.ngCliProject.root, `./${sourceDir}/app/environments/`),
      src: 'environment.ts',
      dest: `environment.${this.environment}.ts`
    }));

    const assetsPluginInstance = new AssetsPlugin({ filename: 'cli.assets.json' });
    const htmlCliPlugin = new HtmlCliPlugin();

    this.config.forEach(conf => {
      conf.plugins.unshift(assetsPluginInstance);
      conf.plugins.unshift(htmlCliPlugin);
    });
  }

  generateConfig(): void {
    switch (this.target) {
      case "development":
        this.config = [
          webpackMerge(this.webpackBaseConfig, this.webpackDevConfigPartial),
          this.webpackCSSConfig
        ];
        break;
      case "production":
        this.config = [
          webpackMerge(this.webpackBaseConfig, this.webpackProdConfigPartial),
          this.webpackCSSConfig
        ];
        break;
      default:
        throw new Error("Invalid build target. Only 'development' and 'production' are available.");
        break;
    }
  }
}
