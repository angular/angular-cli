import * as webpack from 'webpack';
import * as path from 'path';
import * as OfflinePlugin from 'offline-plugin';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import { PrerenderWebpackPlugin } from '../utilities/prerender-webpack-plugin.ts';
import { CliConfig } from './config';

export const getWebpackMobileConfigPartial = function (projectRoot: string, sourceDir: string) {
  return {
    plugins: [
      new CopyWebpackPlugin([
        {from: path.resolve(projectRoot, `./${sourceDir}/icons`), to: path.resolve(projectRoot, './dist/icons')},
        {from: path.resolve(projectRoot, `./${sourceDir}/manifest.webapp`), to: path.resolve(projectRoot, './dist')}
      ]),
      new PrerenderWebpackPlugin({
        templatePath: 'index.html',
        configPath: path.resolve(projectRoot, `./${sourceDir}/main-app-shell.ts`),
        appPath: path.resolve(projectRoot, `./${sourceDir}`)
      })
    ]
  }
};

export const getWebpackMobileProdConfigPartial = function (projectRoot: string, sourceDir: string) {
  return {
    entry: {
      'sw-install': path.resolve(__dirname, '../utilities/sw-install.js')
    },
    plugins: [
      new OfflinePlugin()
    ]
  }
};
