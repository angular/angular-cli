import * as webpack from 'webpack';
import * as path from 'path';
import * as OfflinePlugin from 'offline-plugin';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import { PrerenderWebpackPlugin } from '../utilities/prerender-webpack-plugin.ts';

export const getWebpackMobileConfigPartial = function (projectRoot: string) {
  return {
    plugins: [
      new CopyWebpackPlugin([
        {from: path.resolve(projectRoot, './src/icons'), to: path.resolve(projectRoot, './dist/icons')},
        {from: path.resolve(projectRoot, './src/manifest.webapp'), to: path.resolve(projectRoot, './dist')}
      ]),
      new PrerenderWebpackPlugin({
        templatePath: 'index.html',
        configPath: path.resolve(projectRoot, './src/main-app-shell.ts'),
        appPath: path.resolve(projectRoot, './src')
      })
    ]
  }
};

export const getWebpackMobileProdConfigPartial = function (projectRoot: string) {
  return {
    entry: {
      'sw-install': path.resolve(__dirname, '../utilities/sw-install.js')
    },
    plugins: [
      new OfflinePlugin()
    ]
  }
};
