import * as path from 'path';
import {AotPlugin} from '@ngtools/webpack';


const g: any = global;
const webpackLoader: string = g['angularCliIsLocal']
  ? g.angularCliPackages['@ngtools/webpack'].main
  : '@ngtools/webpack';


export const getWebpackNonAotConfigPartial = function(projectRoot: string, appConfig: any) {
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
        skipCodeGeneration: true
      }),
    ]
  };
};

export const getWebpackAotConfigPartial = function(projectRoot: string, appConfig: any) {
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
        mainPath: path.join(projectRoot, appConfig.root, appConfig.main)
      }),
    ]
  };
};
