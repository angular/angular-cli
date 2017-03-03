import * as path from 'path';
import {ExtractI18nPlugin} from '@ngtools/webpack';

export const getWebpackExtractI18nConfig = function(
  projectRoot: string,
  appConfig: any,
  genDir: string,
  i18nFormat: string,
  locale: string,
  outFile: string): any {

  let exclude: string[] = [];
  if (appConfig.test) {
    exclude.push(path.join(projectRoot, appConfig.root, appConfig.test));
  }

  return  {
    plugins: [
      new ExtractI18nPlugin({
        tsConfigPath: path.resolve(projectRoot, appConfig.root, appConfig.tsconfig),
        exclude: exclude,
        genDir: genDir,
        i18nFormat: i18nFormat,
        locale: locale,
        outFile: outFile,
      })
    ]
  };
};
