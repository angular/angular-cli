/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @license
 * @author Erik Desjardins
 * Forked as of SHA 10fb020f997a146725963b202d79290c8798a7a0 from https://github.com/erikdesjardins/webpack-rollup-loader.
 * Licensed under a MIT license.
 * See https://github.com/erikdesjardins/webpack-rollup-loader/blob/10fb020f997a146725963b202d79290c8798a7a0/LICENSE for full license.
 */

import { VirtualFileSystemDecorator } from '@ngtools/webpack/src/virtual_file_system_decorator';
import { dirname, join } from 'path';
import { OutputAsset, OutputChunk, rollup } from 'rollup';
import { RawSourceMap } from 'source-map';
import webpack = require('webpack');

function splitRequest(request: string) {
  const inx = request.lastIndexOf('!');
  if (inx === -1) {
    return {
      loaders: '',
      resource: request,
    };
  } else {
    return {
      loaders: request.slice(0, inx + 1),
      resource: request.slice(inx + 1),
    };
  }
}

// Load resolve paths using Webpack.
function webpackResolutionPlugin(
  loaderContext: webpack.loader.LoaderContext,
  entryId: string,
  entryIdCodeAndMap: { code: string, map: RawSourceMap },
) {
  return {
    name: 'webpack-resolution-plugin',
    resolveId: (id: string, importerId: string) => {
      if (id === entryId) {
        return entryId;
      } else {
        return new Promise((resolve, reject) => {
          // split apart resource paths because Webpack's this.resolve() can't handle `loader!`
          // prefixes
          const parts = splitRequest(id);
          const importerParts = splitRequest(importerId);

          // resolve the full path of the imported file with Webpack's module loader
          // this will figure out node_modules imports, Webpack aliases, etc.
          loaderContext.resolve(
            dirname(importerParts.resource),
            parts.resource,
            (err, fullPath) => err ? reject(err) : resolve(parts.loaders + fullPath),
          );
        });
      }
    },
    load: (id: string) => {
      if (id === entryId) {
        return entryIdCodeAndMap;
      }

      return new Promise((resolve, reject) => {
        // load the module with Webpack
        // this will apply all relevant loaders, etc.
        loaderContext.loadModule(
          id,
          (err, source, map) => err ? reject(err) : resolve({ code: source, map: map }),
        );
      });
    },
  };
}

export default function webpackRollupLoader(
  this: webpack.loader.LoaderContext,
  source: string,
  sourceMap: RawSourceMap,
) {
  // Note: this loader isn't cacheable because it will add the lazy chunks to the
  // virtual file system on completion.
  const callback = this.async();
  if (!callback) {
    throw new Error('Async loader support is required.');
  }
  const options = this.query || {};
  const entryId = this.resourcePath;
  const sourcemap = this.sourceMap;

  // Get the VirtualFileSystemDecorator that AngularCompilerPlugin added so we can write to it.
  // Since we use webpackRollupLoader as a post loader, this should be there.
  // TODO: we should be able to do this in a more elegant way by again decorating webpacks
  // input file system inside a custom WebpackRollupPlugin, modelled after AngularCompilerPlugin.
  const vfs = this._compiler.inputFileSystem as VirtualFileSystemDecorator;
  const virtualWrite = (path: string, data: string) =>
    vfs.getWebpackCompilerHost().writeFile(path, data, false);

  // Bundle with Rollup
  const rollupOptions = {
    ...options,
    input: entryId,
    plugins: [
      ...(options.plugins || []),
      webpackResolutionPlugin(this, entryId, { code: source, map: sourceMap }),
    ],
  };

  rollup(rollupOptions)
    .then(build => build.generate({ format: 'es', sourcemap }))
    .then(
      (result) => {
        const [mainChunk, ...otherChunksOrAssets] = result.output;

        // Write other chunks and assets to the virtual file system so that webpack can load them.
        const resultDir = dirname(entryId);
        otherChunksOrAssets.forEach(chunkOrAsset => {
          const { fileName, type } = chunkOrAsset;
          if (type == 'chunk') {
            const { code, map } = chunkOrAsset as OutputChunk;
            virtualWrite(join(resultDir, fileName), code);
            if (map) {
              // Also write the map if there's one.
              // Probably need scriptsSourceMap set on CLI to load it.
              virtualWrite(join(resultDir, `${fileName}.map`), map.toString());
            }
          } else if (type == 'asset') {
            const { source } = chunkOrAsset as OutputAsset;
            // Source might be a Buffer. Just assuming it's a string for now.
            virtualWrite(join(resultDir, fileName), source as string);
          }
        });

        // Always return the main chunk from webpackRollupLoader.
        // Cast to any here is needed because of a typings incompatibility between source-map versions.
        // tslint:disable-next-line:no-any
        callback(null, mainChunk.code, (mainChunk as any).map);
      },
      (err) => callback(err),
    );
}
