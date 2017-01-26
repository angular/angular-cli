import * as path from 'path';
import {AotPlugin} from '@ngtools/webpack';
import { WebpackConfigOptions } from '../webpack-config';


const g: any = global;
const webpackLoader: string = g['angularCliIsLocal']
  ? g.angularCliPackages['@ngtools/webpack'].main
  : '@ngtools/webpack';


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
      new AotPlugin({
        tsConfigPath: path.resolve(projectRoot, appConfig.root, appConfig.tsconfig),
        mainPath: path.join(projectRoot, appConfig.root, appConfig.main),
        exclude: exclude,
        skipCodeGeneration: true
      }),
    ]
  };
};

export const getAotConfig = function(wco: WebpackConfigOptions) {
  const { projectRoot, buildOptions, appConfig } = wco;
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
      new AotPlugin({
        tsConfigPath: path.resolve(projectRoot, appConfig.root, appConfig.tsconfig),
        mainPath: path.join(projectRoot, appConfig.root, appConfig.main),
        i18nFile: buildOptions.i18nFile,
        i18nFormat: buildOptions.i18nFormat,
        locale: buildOptions.locale,
        exclude: exclude
      })
    ]
  };
};
