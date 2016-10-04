import * as path from 'path';
const OfflinePlugin = require('offline-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
import { PrerenderWebpackPlugin } from '../utilities/prerender-webpack-plugin';
import {BaseHrefWebpackPlugin} from '@angular-cli/base-href-webpack';
import { htmlWebpackTagRewriter } from '../utilities/html-webpack-tag-rewriter';

export const getWebpackMobileConfigPartial = function (projectRoot: string, appConfig: any,
    baseHref: string) {
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
      new BaseHrefWebpackPlugin({
        baseHref: baseHref
      }),
      new PrerenderWebpackPlugin({
        templatePath: path.resolve(projectRoot, appConfig.root, 'index.html'),
        configPath: path.resolve(projectRoot, appConfig.root, 'main-app-shell.ts'),
        appPath: path.resolve(projectRoot, appConfig.root)
      }),
      htmlWebpackTagRewriter
    ]
  };
};

export const getWebpackMobileProdConfigPartial = function (projectRoot: string, appConfig: any,
    baseHref: string) {
  return {
    entry: {
      'sw-install': path.resolve(__dirname, '../utilities/sw-install.js')
    },
    plugins: [
      new OfflinePlugin()
    ]
  };
};
