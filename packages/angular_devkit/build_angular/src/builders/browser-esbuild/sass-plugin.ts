/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { PartialMessage, Plugin, PluginBuild } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { CompileResult, Exception } from 'sass';
import { SassWorkerImplementation } from '../../sass/sass-service';

let sassWorkerPool: SassWorkerImplementation;

function isSassException(error: unknown): error is Exception {
  return !!error && typeof error === 'object' && 'sassMessage' in error;
}

export function shutdownSassWorkerPool(): void {
  sassWorkerPool?.close();
}

export function createSassPlugin(options: { sourcemap: boolean; loadPaths?: string[] }): Plugin {
  return {
    name: 'angular-sass',
    setup(build: PluginBuild): void {
      build.onLoad({ filter: /\.s[ac]ss$/ }, async (args) => {
        // Lazily load Sass when a Sass file is found
        sassWorkerPool ??= new SassWorkerImplementation();

        const warnings: PartialMessage[] = [];
        try {
          const data = await readFile(args.path, 'utf-8');
          const { css, sourceMap, loadedUrls } = await sassWorkerPool.compileStringAsync(data, {
            url: pathToFileURL(args.path),
            style: 'expanded',
            loadPaths: options.loadPaths,
            sourceMap: options.sourcemap,
            sourceMapIncludeSources: options.sourcemap,
            quietDeps: true,
            logger: {
              warn: (text, { deprecation, span }) => {
                warnings.push({
                  text: deprecation ? 'Deprecation' : text,
                  location: span && {
                    file: span.url && fileURLToPath(span.url),
                    lineText: span.context,
                    // Sass line numbers are 0-based while esbuild's are 1-based
                    line: span.start.line + 1,
                    column: span.start.column,
                  },
                  notes: deprecation ? [{ text }] : undefined,
                });
              },
            },
          });

          return {
            loader: 'css',
            contents: sourceMap
              ? `${css}\n${sourceMapToUrlComment(sourceMap, dirname(args.path))}`
              : css,
            watchFiles: loadedUrls.map((url) => fileURLToPath(url)),
            warnings,
          };
        } catch (error) {
          if (isSassException(error)) {
            const file = error.span.url ? fileURLToPath(error.span.url) : undefined;

            return {
              loader: 'css',
              errors: [
                {
                  text: error.message,
                },
              ],
              warnings,
              watchFiles: file ? [file] : undefined,
            };
          }

          throw error;
        }
      });
    },
  };
}

function sourceMapToUrlComment(
  sourceMap: Exclude<CompileResult['sourceMap'], undefined>,
  root: string,
): string {
  // Remove `file` protocol from all sourcemap sources and adjust to be relative to the input file.
  // This allows esbuild to correctly process the paths.
  sourceMap.sources = sourceMap.sources.map((source) => relative(root, fileURLToPath(source)));

  const urlSourceMap = Buffer.from(JSON.stringify(sourceMap), 'utf-8').toString('base64');

  return `/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${urlSourceMap} */`;
}
