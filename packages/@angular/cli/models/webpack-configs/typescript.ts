import * as fs from 'fs';
import * as path from 'path';
import {AotPlugin, AotPluginOptions} from '@ngtools/webpack';
import { WebpackConfigOptions } from '../webpack-config';

const SilentError = require('silent-error');


const g: any = global;
const webpackLoader: string = g['angularCliIsLocal']
  ? g.angularCliPackages['@ngtools/webpack'].main
  : '@ngtools/webpack';


function _createAotPlugin(wco: WebpackConfigOptions, options: any) {
  const { appConfig, projectRoot, buildOptions } = wco;

  // Read the environment, and set it in the compiler host.
  let hostOverrideFileSystem: any = {};
  // process environment file replacement
  if (appConfig.environments) {
    if (!('source' in appConfig.environments)) {
      throw new SilentError(`Environment configuration does not contain "source" entry.`);
    }
    if (!(buildOptions.environment in appConfig.environments)) {
      throw new SilentError(`Environment "${buildOptions.environment}" does not exist.`);
    }

    const appRoot = path.resolve(projectRoot, appConfig.root);
    const sourcePath = appConfig.environments['source'];
    const envFile = appConfig.environments[buildOptions.environment];
    const environmentContent = fs.readFileSync(path.join(appRoot, envFile)).toString();

    hostOverrideFileSystem = { [path.join(appRoot, sourcePath)]: environmentContent };
  }

  return new AotPlugin(Object.assign({}, {
      tsConfigPath: path.resolve(projectRoot, appConfig.root, appConfig.tsconfig),
      mainPath: path.join(projectRoot, appConfig.root, appConfig.main),
      i18nFile: buildOptions.i18nFile,
      i18nFormat: buildOptions.i18nFormat,
      locale: buildOptions.locale,
      hostOverrideFileSystem
    }, options));
}


export const getNonAotConfig = function(wco: WebpackConfigOptions) {
  const { projectRoot, appConfig } = wco;
  let exclude = [ '**/*.spec.ts' ];
  if (appConfig.test) { exclude.push(path.join(projectRoot, appConfig.root, appConfig.test)); };
  return {
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: webpackLoader,
          exclude: [/\.(spec|e2e)\.ts$/]
        }
      ]
    },
    plugins: [
      _createAotPlugin(wco, { exclude, skipCodeGeneration: true }),
    ]
  };
};

export const getAotConfig = function(wco: WebpackConfigOptions) {
  const { projectRoot, appConfig } = wco;
  let exclude = [ '**/*.spec.ts' ];
  if (appConfig.test) { exclude.push(path.join(projectRoot, appConfig.root, appConfig.test)); };
  return {
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: webpackLoader,
          exclude: [/\.(spec|e2e)\.ts$/]
        }
      ]
    },
    plugins: [
      _createAotPlugin(wco, { exclude })
    ]
  };
};
