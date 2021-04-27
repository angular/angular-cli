/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

import { Compiler, loader } from 'webpack';
import { CachedSource, ConcatSource, OriginalSource, RawSource, Source } from 'webpack-sources';
import { interpolateName } from 'loader-utils';
import * as path from 'path';
import { isWebpackFiveOrHigher } from '../../utils/webpack-version';

const Chunk = require('webpack/lib/Chunk');
const EntryPoint = require('webpack/lib/Entrypoint');

export interface ScriptsWebpackPluginOptions {
  name: string;
  sourceMap: boolean;
  scripts: string[];
  filename: string;
  basePath: string;
}

interface ScriptOutput {
  filename: string;
  source: CachedSource;
}

function addDependencies(compilation: any, scripts: string[]): void {
  for (const script of scripts) {
    compilation.fileDependencies.add(script);
  }
}
export class ScriptsWebpackPlugin {
  private _lastBuildTime?: number;
  private _cachedOutput?: ScriptOutput;

  constructor(private options: Partial<ScriptsWebpackPluginOptions> = {}) { }

  async shouldSkip(compilation: any, scripts: string[]): Promise<boolean> {
    if (this._lastBuildTime == undefined) {
      this._lastBuildTime = Date.now();
      return false;
    }

    for (const script of scripts) {
      const scriptTime = isWebpackFiveOrHigher()
        ? await new Promise<number | undefined>((resolve, reject) => {
          compilation.fileSystemInfo.getFileTimestamp(script, (error: unknown, entry: any) => {
            if (error) {
              reject(error);

              return;
            }

            resolve(typeof entry !== 'string' ? entry.safeTime : undefined)
          })
        })
        : compilation.fileTimestamps.get(script);

      if (!scriptTime || scriptTime > this._lastBuildTime) {
        this._lastBuildTime = Date.now();
        return false;
      }
    }

    return true;
  }

  private _insertOutput(compilation: any, { filename, source }: ScriptOutput, cached = false) {
    const chunk = new Chunk(this.options.name);
    chunk.rendered = !cached;
    chunk.id = this.options.name;
    chunk.ids = [chunk.id];
    if (isWebpackFiveOrHigher()) {
      chunk.files.add(filename);
    } else {
      chunk.files.push(filename);
    }

    const entrypoint = new EntryPoint(this.options.name);
    entrypoint.pushChunk(chunk);
    chunk.addGroup(entrypoint);
    compilation.entrypoints.set(this.options.name, entrypoint);
    if (isWebpackFiveOrHigher()) {
      compilation.chunks.add(chunk);
    } else {
      compilation.chunks.push(chunk);
    }

    compilation.assets[filename] = source;
    compilation.hooks.chunkAsset.call(chunk, filename);
  }

  apply(compiler: Compiler): void {
    if (!this.options.scripts || this.options.scripts.length === 0) {
      return;
    }

    const scripts = this.options.scripts
      .filter(script => !!script)
      .map(script => path.resolve(this.options.basePath || '', script));

    compiler.hooks.thisCompilation.tap('scripts-webpack-plugin', compilation => {
      compilation.hooks.additionalAssets.tapPromise('scripts-webpack-plugin', async () => {
          if (await this.shouldSkip(compilation, scripts)) {
            if (this._cachedOutput) {
              this._insertOutput(compilation, this._cachedOutput, true);
            }

            addDependencies(compilation, scripts);

            return;
          }

          const sourceGetters = scripts.map(fullPath => {
            return new Promise<Source>((resolve, reject) => {
              compilation.inputFileSystem.readFile(fullPath, (err: Error, data: Buffer) => {
                if (err) {
                  reject(err);
                  return;
                }

                const content = data.toString();

                let source;
                if (this.options.sourceMap) {
                  // TODO: Look for source map file (for '.min' scripts, etc.)

                  let adjustedPath = fullPath;
                  if (this.options.basePath) {
                    adjustedPath = path.relative(this.options.basePath, fullPath);
                  }
                  source = new OriginalSource(content, adjustedPath);
                } else {
                  source = new RawSource(content);
                }

                resolve(source);
              });
            });
          });

          const sources = await Promise.all(sourceGetters);
          const concatSource = new ConcatSource();
          sources.forEach(source => {
            concatSource.add(source);
            concatSource.add('\n;');
          });

          const combinedSource = new CachedSource(concatSource);
          const filename = interpolateName(
            { resourcePath: 'scripts.js' } as loader.LoaderContext,
            this.options.filename as string,
            { content: combinedSource.source() },
          );

          const output = { filename, source: combinedSource };
          this._insertOutput(compilation, output);
          this._cachedOutput = output;
          addDependencies(compilation, scripts);
        });
    });
  }
}
