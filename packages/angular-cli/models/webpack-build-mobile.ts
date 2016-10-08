import * as path from 'path';
const OfflinePlugin = require('offline-plugin');
import { GlobCopyWebpackPlugin } from '../plugins/glob-copy-webpack-plugin';
import { PrerenderWebpackPlugin } from '../utilities/prerender-webpack-plugin';

export const getWebpackMobileConfigPartial = function (projectRoot: string, appConfig: any) {
  // Hardcoded files and paths here should be part of appConfig when
  // reworking the mobile app functionality
  return {
    plugins: [
      new GlobCopyWebpackPlugin({
        patterns: [ 'icons', 'manifest.webapp'],
        globOptions: {cwd: appConfig.root, dot: true, ignore: '**/.gitkeep'}
      }),
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
