const webpackMerge = require('webpack-merge');
import { CliConfig } from './config';
import { BuildOptions } from './build-options';
import {
  getCommonConfig,
  getDevConfig,
  getProdConfig,
  getStylesConfig,
  getNonAotConfig,
  getAotConfig
} from './webpack-configs';

const path = require('path');

export interface WebpackConfigOptions {
  projectRoot: string;
  buildOptions: BuildOptions;
  appConfig: any;
}

export class NgCliWebpackConfig {
  public config: any;
  constructor(buildOptions: BuildOptions) {

    this.validateBuildOptions(buildOptions);

    const configPath = CliConfig.configFilePath();
    const projectRoot = path.dirname(configPath);
    let appConfig = CliConfig.fromProject().config.apps[0];

    appConfig = this.addAppConfigDefaults(appConfig);
    buildOptions = this.addTargetDefaults(buildOptions);
    buildOptions = this.mergeConfigs(buildOptions, appConfig);

    const wco: WebpackConfigOptions = { projectRoot, buildOptions, appConfig };

    let webpackConfigs = [
      getCommonConfig(wco),
      getStylesConfig(wco),
      this.getTargetConfig(wco)
    ];

    if (appConfig.main || appConfig.polyfills) {
      const typescriptConfigPartial = buildOptions.aot
        ? getAotConfig(wco)
        : getNonAotConfig(wco);
      webpackConfigs.push(typescriptConfigPartial);
    }

    // add style config
    this.config = webpackMerge(webpackConfigs);
  }

  getTargetConfig(webpackConfigOptions: WebpackConfigOptions): any {
    switch (webpackConfigOptions.buildOptions.target) {
      case 'development':
        return getDevConfig(webpackConfigOptions);
      case 'production':
        return getProdConfig(webpackConfigOptions);
    }
  }

  // Validate build options
  private validateBuildOptions(buildOptions: BuildOptions) {
    if (buildOptions.target !== 'development' && buildOptions.target !== 'production') {
      throw new Error("Invalid build target. Only 'development' and 'production' are available.");
    }
  }

  // Fill in defaults for build targets
  private addTargetDefaults(buildOptions: BuildOptions) {
    const targetDefaults: any = {
      development: {
        environment: 'dev',
        outputHashing: 'none',
        sourcemap: true,
        extractCss: false
      },
      production: {
        environment: 'prod',
        outputHashing: 'all',
        sourcemap: false,
        extractCss: true,
        aot: true
      }
    };

    return Object.assign({}, targetDefaults[buildOptions.target], buildOptions);
  }

  // Fill in defaults from angular-cli.json
  private mergeConfigs(buildOptions: BuildOptions, appConfig: any) {
    const mergeableOptions = {
      outputPath: appConfig.outDir,
      deployUrl: appConfig.deployUrl
    };

    return Object.assign({}, mergeableOptions, buildOptions);
  }

  private addAppConfigDefaults(appConfig: any) {
    const appConfigDefaults: any = {
      scripts: [],
      styles: []
    };

    // can't use Object.assign here because appConfig has a lot of getters/setters
    for (let key of Object.keys(appConfigDefaults)) {
      appConfig[key] = appConfig[key] || appConfigDefaults[key];
    }

    return appConfig;
  }
}
