import * as path from 'path';
import {AotPlugin, ResolveEntryModuleError} from '@ngtools/webpack';


const g: any = global;
const webpackLoader: string = g['angularCliIsLocal']
  ? g.angularCliPackages['@ngtools/webpack'].main
  : '@ngtools/webpack';


export const getWebpackNonAotConfigPartial = function(projectRoot: string, appConfig: any) {
  try {
    let exclude = [ '**/*.spec.ts' ];
    if (appConfig.test) { exclude.push(path.join(projectRoot, appConfig.root, appConfig.test)); };
    let entryModule = appConfig.entryModule &&
      path.join(projectRoot, appConfig.root, appConfig.entryModule);
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
          entryModule: entryModule,
          exclude: exclude,
          skipCodeGeneration: true
        }),
      ]
    };
  } catch (e) {
    if (e instanceof ResolveEntryModuleError) {
      throw new Error('Tried to find bootstrap code, but could not. Either provide '
                    + 'statically analyzable bootstrap code or specify entryModule '
                    + 'in angular-cli options.');
    } else {
      throw e;
    }
  }
};

export const getWebpackAotConfigPartial = function(projectRoot: string, appConfig: any,
  i18nFile: string, i18nFormat: string, locale: string) {
  try {
    let exclude = [ '**/*.spec.ts' ];
    if (appConfig.test) { exclude.push(path.join(projectRoot, appConfig.root, appConfig.test)); };
    let entryModule = appConfig.entryModule &&
      path.join(projectRoot, appConfig.root, appConfig.entryModule);
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
          entryModule: entryModule,
          i18nFile: i18nFile,
          i18nFormat: i18nFormat,
          locale: locale,
          exclude: exclude
        })
      ]
    };
  } catch (e) {
    if (e instanceof ResolveEntryModuleError) {
      throw new Error('Tried to find bootstrap code, but could not. Either provide '
                    + 'statically analyzable bootstrap code or specify entryModule '
                    + 'in angular-cli options.');
    } else {
      throw e;
    }
  }
};
