const webpackMerge = require('webpack-merge');
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
  private devConfigPartial: any;
  private prodConfigPartial: any;
  private baseConfig: any;

  constructor(
    public ngCliProject: any,
    public target: string,
    public environment: string,
    outputDir?: string,
    baseHref?: string
  ) {
    const config: CliConfig = CliConfig.fromProject();
    const appConfig = config.config.apps[0];

    appConfig.outDir = outputDir || appConfig.outDir;

    this.baseConfig = getWebpackCommonConfig(
      this.ngCliProject.root,
      environment,
      appConfig,
      baseHref
    );
    this.devConfigPartial = getWebpackDevConfigPartial(this.ngCliProject.root, appConfig);
    this.prodConfigPartial = getWebpackProdConfigPartial(this.ngCliProject.root, appConfig);

    if (appConfig.mobile) {
      let mobileConfigPartial = getWebpackMobileConfigPartial(this.ngCliProject.root, appConfig);
      let mobileProdConfigPartial = getWebpackMobileProdConfigPartial(this.ngCliProject.root,
                                                                      appConfig);
      this.baseConfig = webpackMerge(this.baseConfig, mobileConfigPartial);
      this.prodConfigPartial = webpackMerge(this.prodConfigPartial, mobileProdConfigPartial);
    }

    this.generateConfig();
  }

  generateConfig(): void {
    switch (this.target) {
      case 'development':
        this.config = webpackMerge(this.baseConfig, this.devConfigPartial);
        break;
      case 'production':
        this.config = webpackMerge(this.baseConfig, this.prodConfigPartial);
        break;
      default:
        throw new Error("Invalid build target. Only 'development' and 'production' are available.");
    }
  }
}
