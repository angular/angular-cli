import * as path from 'path';
import { stripIndent } from 'common-tags';
import {AotPlugin} from '@ngtools/webpack';
import { WebpackConfigOptions } from '../webpack-config';

const SilentError = require('silent-error');


const g: any = global;
const webpackLoader: string = g['angularCliIsLocal']
  ? g.angularCliPackages['@ngtools/webpack'].main
  : '@ngtools/webpack';


function _createAotPlugin(wco: WebpackConfigOptions, options: any) {
  const { appConfig, projectRoot, buildOptions } = wco;

  // Read the environment, and set it in the compiler host.
  let hostReplacementPaths: any = {};
  // process environment file replacement
  if (appConfig.environments) {
    if (!appConfig.environmentSource) {
      let migrationMessage = '';
      if ('source' in appConfig.environments) {
        migrationMessage = '\n\n' + stripIndent`
          A new environmentSource entry replaces the previous source entry inside environments.

          To migrate angular-cli.json follow the example below:

          Before:

          "environments": {
            "source": "environments/environment.ts",
            "dev": "environments/environment.ts",
            "prod": "environments/environment.prod.ts"
          }


          After:

          "environmentSource": "environments/environment.ts",
          "environments": {
            "dev": "environments/environment.ts",
            "prod": "environments/environment.prod.ts"
          }
        `;
      }
      throw new SilentError(
        `Environment configuration does not contain "environmentSource" entry.${migrationMessage}`
      );

    }
    if (!(buildOptions.environment in appConfig.environments)) {
      throw new SilentError(`Environment "${buildOptions.environment}" does not exist.`);
    }

    const appRoot = path.resolve(projectRoot, appConfig.root);
    const sourcePath = appConfig.environmentSource;
    const envFile = appConfig.environments[buildOptions.environment];

    hostReplacementPaths = {
      [path.join(appRoot, sourcePath)]: path.join(appRoot, envFile)
    };
  }

  return new AotPlugin(Object.assign({}, {
      tsConfigPath: path.resolve(projectRoot, appConfig.root, appConfig.tsconfig),
      mainPath: path.join(projectRoot, appConfig.root, appConfig.main),
      i18nFile: buildOptions.i18nFile,
      i18nFormat: buildOptions.i18nFormat,
      locale: buildOptions.locale,
      hostReplacementPaths
    }, options));
}


export const getNonAotConfig = function(wco: WebpackConfigOptions) {
  const { projectRoot, appConfig } = wco;
  let exclude = [ '**/*.spec.ts' ];
  if (appConfig.test) {
    exclude.push(path.join(projectRoot, appConfig.root, appConfig.test));
  }

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

export const getNonAotTestConfig = function(wco: WebpackConfigOptions) {
  return {
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: webpackLoader,
          query: { module: 'commonjs' },
          exclude: [/\.(e2e)\.ts$/]
        }
      ]
    },
    plugins: [
      _createAotPlugin(wco, {
        exclude: [],
        skipCodeGeneration: true,
        compilerOptions: {
          module: 'commonjs'
        }
      }),
    ]
  };
};
