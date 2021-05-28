/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { interpolateName } from 'loader-utils';
import * as path from 'path';
import { Chunk, Compilation, Compiler, sources as webpackSources } from 'webpack';

const Entrypoint = require('webpack/lib/Entrypoint');

export interface ScriptsWebpackPluginOptions {
  name: string;
  sourceMap?: boolean;
  scripts: string[];
  filename: string;
  basePath: string;
}

interface ScriptOutput {
  filename: string;
  source: webpackSources.CachedSource;
}

function addDependencies(compilation: Compilation, scripts: string[]): void {
  for (const script of scripts) {
    compilation.fileDependencies.add(script);
  }
}
export class ScriptsWebpackPlugin {
  private _lastBuildTime?: number;
  private _cachedOutput?: ScriptOutput;

  constructor(private options: ScriptsWebpackPluginOptions) {}

  async shouldSkip(compilation: Compilation, scripts: string[]): Promise<boolean> {
    if (this._lastBuildTime == undefined) {
      this._lastBuildTime = Date.now();

      return false;
    }

    for (const script of scripts) {
      const scriptTime = await new Promise<number | undefined>((resolve, reject) => {
        compilation.fileSystemInfo.getFileTimestamp(script, (error, entry) => {
          if (error) {
            reject(error);

            return;
          }

          resolve(entry && typeof entry !== 'string' ? entry.safeTime : undefined);
        });
      });

      if (!scriptTime || scriptTime > this._lastBuildTime) {
        this._lastBuildTime = Date.now();

        return false;
      }
    }

    return true;
  }

  private _insertOutput(
    compilation: Compilation,
    { filename, source }: ScriptOutput,
    cached = false,
  ) {
    const chunk = new Chunk(this.options.name);
    chunk.rendered = !cached;
    chunk.id = this.options.name;
    chunk.ids = [chunk.id];
    chunk.files.add(filename);

    const entrypoint = new Entrypoint(this.options.name);
    entrypoint.pushChunk(chunk);
    chunk.addGroup(entrypoint);
    compilation.entrypoints.set(this.options.name, entrypoint);
    compilation.chunks.add(chunk);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    compilation.assets[filename] = source as any;
    compilation.hooks.chunkAsset.call(chunk, filename);
  }

  apply(compiler: Compiler): void {
    if (!this.options.scripts || this.options.scripts.length === 0) {
      return;
    }

    const scripts = this.options.scripts
      .filter((script) => !!script)
      .map((script) => path.resolve(this.options.basePath || '', script));

    compiler.hooks.thisCompilation.tap('scripts-webpack-plugin', (compilation) => {
      compilation.hooks.additionalAssets.tapPromise('scripts-webpack-plugin', async () => {
        if (await this.shouldSkip(compilation, scripts)) {
          if (this._cachedOutput) {
            this._insertOutput(compilation, this._cachedOutput, true);
          }

          addDependencies(compilation, scripts);

          return;
        }

        const sourceGetters = scripts.map((fullPath) => {
          return new Promise<webpackSources.Source>((resolve, reject) => {
            compilation.inputFileSystem.readFile(
              fullPath,
              (err?: Error | null, data?: string | Buffer) => {
                if (err) {
                  reject(err);

                  return;
                }

                const content = data?.toString() ?? '';

                let source;
                if (this.options.sourceMap) {
                  // TODO: Look for source map file (for '.min' scripts, etc.)

                  let adjustedPath = fullPath;
                  if (this.options.basePath) {
                    adjustedPath = path.relative(this.options.basePath, fullPath);
                  }
                  source = new webpackSources.OriginalSource(content, adjustedPath);
                } else {
                  source = new webpackSources.RawSource(content);
                }

                resolve(source);
              },
            );
          });
        });

        const sources = await Promise.all(sourceGetters);
        const concatSource = new webpackSources.ConcatSource();
        sources.forEach((source) => {
          concatSource.add(source);
          concatSource.add('\n;');
        });

        const combinedSource = new webpackSources.CachedSource(concatSource);
        const filename = interpolateName(
          { resourcePath: 'scripts.js' },
          this.options.filename as string,
          {
            content: combinedSource.source(),
          },
        );

        const output = { filename, source: combinedSource };
        this._insertOutput(compilation, output);
        this._cachedOutput = output;
        addDependencies(compilation, scripts);
      });
    });
  }
}
