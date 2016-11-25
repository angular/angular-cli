import {
  getWebpackAotConfigPartial,
  getWebpackNonAotConfigPartial
} from './webpack-build-typescript';
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

  constructor(
    public ngCliProject: any,
    public target: string,
    public environment: string,
    outputDir?: string,
    baseHref?: string,
    isAoT = false,
    sourcemap = true,
    vendorChunk = false,
  ) {
    const config: CliConfig = CliConfig.fromProject();
    const appConfig = config.config.apps[0];

    appConfig.outDir = outputDir || appConfig.outDir;

    let baseConfig = getWebpackCommonConfig(
      this.ngCliProject.root,
      environment,
      appConfig,
      baseHref,
      sourcemap,
      vendorChunk
    );
    let targetConfigPartial = this.getTargetConfig(this.ngCliProject.root, appConfig);
    const typescriptConfigPartial = isAoT
      ? getWebpackAotConfigPartial(this.ngCliProject.root, appConfig)
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

    this.config = webpackMerge(
      baseConfig,
      targetConfigPartial,
      typescriptConfigPartial
    );
  }

  getTargetConfig(projectRoot: string, appConfig: any): any {
    switch (this.target) {
      case 'development':
        return getWebpackDevConfigPartial(projectRoot, appConfig);
      case 'production':
        return getWebpackProdConfigPartial(projectRoot, appConfig);
      default:
        throw new Error("Invalid build target. Only 'development' and 'production' are available.");
    }
  }
}
