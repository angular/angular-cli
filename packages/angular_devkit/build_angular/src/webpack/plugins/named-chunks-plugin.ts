/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { AsyncDependenciesBlock, Chunk, Compiler, Template, dependencies } from 'webpack';

// `ImportDependency` is not part of Webpack's depenencies typings.
const ImportDependency: typeof dependencies.ModuleDependency = require('webpack/lib/dependencies/ImportDependency');

const PLUGIN_NAME = 'named-chunks-plugin';

/**
 * Webpack will not populate the chunk `name` property unless `webpackChunkName` magic comment is used.
 * This however will also effect the filename which is not desired when using `deterministic` chunkIds.
 * This plugin will populate the chunk `name` which is mainly used so that users can set bundle budgets on lazy chunks.
 */
export class NamedChunksPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.chunkAsset.tap(PLUGIN_NAME, (chunk) => {
        if (chunk.name) {
          return;
        }

        const name = this.generateName(chunk);
        if (name) {
          chunk.name = name;
        }
      });
    });
  }

  private generateName(chunk: Chunk): string | undefined {
    for (const group of chunk.groupsIterable) {
      const [block] = group.getBlocks();
      if (!(block instanceof AsyncDependenciesBlock)) {
        continue;
      }

      for (const dependency of block.dependencies) {
        if (dependency instanceof ImportDependency) {
          return Template.toPath(dependency.request);
        }
      }
    }

    return undefined;
  }
}
