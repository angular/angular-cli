import * as path from 'path';
const OfflinePlugin = require('offline-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
import { PrerenderWebpackPlugin } from '../utilities/prerender-webpack-plugin.ts';

export const getWebpackMobileConfigPartial = function (projectRoot: string, appConfig: any) {
  // Hardcoded files and paths here should be part of appConfig when
  // reworking the mobile app functionality
  return {
    plugins: [
      new CopyWebpackPlugin([
        {
          from: path.resolve(projectRoot, appConfig.root, 'icons'),
          to: path.resolve(projectRoot, appConfig.outDir, 'icons')
        }, {
          from: path.resolve(projectRoot, appConfig.root, 'manifest.webapp'),
          to: path.resolve(projectRoot, appConfig.outDir)
        }
      ]),
      new PrerenderWebpackPlugin({
        templatePath: 'index.html',
        configPath: path.resolve(projectRoot, appConfig.root, 'main-app-shell.ts'),
        appPath: path.resolve(projectRoot, appConfig.root)
      })
    ]
  };
};

export const getWebpackMobileProdConfigPartial = function (projectRoot: string, appConfig: any) {
  return {
    entry: {
      'sw-install': path.resolve(__dirname, '../utilities/sw-install.js')
    },
    plugins: [
      new OfflinePlugin()
    ]
  };
};
