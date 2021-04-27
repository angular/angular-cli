/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler } from 'webpack';
import { isWebpackFiveOrHigher } from '../../utils/webpack-version';
import { HashFormat } from '../utils/helpers';


export interface RemoveHashPluginOptions {
  chunkNames: string[];
  hashFormat: HashFormat;
}

export class RemoveHashPlugin {

  constructor(private options: RemoveHashPluginOptions) { }

  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('remove-hash-plugin', compilation => {
      const assetPath = (path: string, data: { chunk?: { name: string } }) => {
        const chunkName = data.chunk?.name;
        const { chunkNames, hashFormat } = this.options;

        if (chunkName && chunkNames?.includes(chunkName)) {
          // Replace hash formats with empty strings.
          return path
            .replace(hashFormat.chunk, '')
            .replace(hashFormat.extract, '');
        }

        return path;
      };

      if (isWebpackFiveOrHigher()) {
        compilation.hooks.assetPath.tap('remove-hash-plugin', assetPath);
      } else {
        const mainTemplate = compilation.mainTemplate as typeof compilation.mainTemplate & {
          hooks: typeof compilation['hooks'];
        };
        mainTemplate.hooks.assetPath.tap('remove-hash-plugin', assetPath);
      }
    });
  }
}
