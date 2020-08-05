/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { readFileSync } from 'fs';
import * as path from 'path';
import { Configuration } from 'webpack';
import { RawSource } from 'webpack-sources';

const Critters = require('critters-webpack-plugin');

export function getHtmlConfig(indexHtmlPath: string): Configuration {
  const outputPath = path.dirname(indexHtmlPath);

  return {
    mode: 'none',
    entry: path.join(__dirname, '../critical-css-index.js'),
    output: {
      path: outputPath,
    },
    plugins: [
      {
        apply(compiler) {
          compiler.hooks.compilation.tap('build-angular', compilation => {
            compilation.assets[indexHtmlPath] = new RawSource(readFileSync(indexHtmlPath, 'utf-8'));
          });
          compiler.hooks.emit.tap('build-angular', compilation => {
            delete compilation.assets['main.js'];
          });
        },
      },
      new Critters({
        inlineThreshold: 12,
        mergeStylesheets: false,
        pruneSource: false,
        compress: false,
        fonts: true,
        preload: 'media',
      }),
    ],
  };
}