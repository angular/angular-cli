/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { OnLoadResult, PartialMessage, ResolveResult } from 'esbuild';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { CompileResult, Exception, Syntax } from 'sass';
import type {
  FileImporterWithRequestContextOptions,
  SassWorkerImplementation,
} from '../../sass/sass-service';
import { StylesheetLanguage, StylesheetPluginOptions } from './stylesheet-plugin-factory';

let sassWorkerPool: SassWorkerImplementation | undefined;

function isSassException(error: unknown): error is Exception {
  return !!error && typeof error === 'object' && 'sassMessage' in error;
}

export function shutdownSassWorkerPool(): void {
  sassWorkerPool?.close();
  sassWorkerPool = undefined;
}

export const SassStylesheetLanguage = Object.freeze<StylesheetLanguage>({
  name: 'sass',
  componentFilter: /^s[ac]ss;/,
  fileFilter: /\.s[ac]ss$/,
  process(data, file, format, options, build) {
    const syntax = format === 'sass' ? 'indented' : 'scss';
    const resolveUrl = async (url: string, options: FileImporterWithRequestContextOptions) => {
      let result = await build.resolve(url, {
        kind: 'import-rule',
        // Use the provided resolve directory from the custom Sass service if available
        resolveDir: options.resolveDir ?? build.initialOptions.absWorkingDir,
      });

      // If a resolve directory is provided, no additional speculative resolutions are required
      if (options.resolveDir) {
        return result;
      }

      // Workaround to support Yarn PnP and pnpm without access to the importer file from Sass
      if (!result.path && options.previousResolvedModules?.size) {
        for (const previous of options.previousResolvedModules) {
          result = await build.resolve(url, {
            kind: 'import-rule',
            resolveDir: previous,
          });
          if (result.path) {
            break;
          }
        }
      }

      return result;
    };

    return compileString(data, file, syntax, options, resolveUrl);
  },
});

function parsePackageName(url: string): { packageName: string; readonly pathSegments: string[] } {
  const parts = url.split('/');
  const hasScope = parts.length >= 2 && parts[0].startsWith('@');
  const [nameOrScope, nameOrFirstPath, ...pathPart] = parts;
  const packageName = hasScope ? `${nameOrScope}/${nameOrFirstPath}` : nameOrScope;

  return {
    packageName,
    get pathSegments() {
      return !hasScope && nameOrFirstPath ? [nameOrFirstPath, ...pathPart] : pathPart;
    },
  };
}

class Cache<K, V> extends Map<K, V> {
  async getOrCreate(key: K, creator: () => V | Promise<V>): Promise<V> {
    let value = this.get(key);

    if (value === undefined) {
      value = await creator();
      this.set(key, value);
    }

    return value;
  }
}

async function compileString(
  data: string,
  filePath: string,
  syntax: Syntax,
  options: StylesheetPluginOptions,
  resolveUrl: (
    url: string,
    options: FileImporterWithRequestContextOptions,
  ) => Promise<ResolveResult>,
): Promise<OnLoadResult> {
  // Lazily load Sass when a Sass file is found
  if (sassWorkerPool === undefined) {
    const sassService = await import('../../sass/sass-service');
    sassWorkerPool = new sassService.SassWorkerImplementation(true);
  }

  // Cache is currently local to individual compile requests.
  // Caching follows Sass behavior where a given url will always resolve to the same value
  // regardless of its importer's path.
  // A null value indicates that the cached resolution attempt failed to find a location and
  // later stage resolution should be attempted. This avoids potentially expensive repeat
  // failing resolution attempts.
  const resolutionCache = new Cache<string, URL | null>();
  const packageRootCache = new Cache<string, string | null>();

  const warnings: PartialMessage[] = [];
  try {
    const { css, sourceMap, loadedUrls } = await sassWorkerPool.compileStringAsync(data, {
      url: pathToFileURL(filePath),
      style: 'expanded',
      syntax,
      loadPaths: options.includePaths,
      sourceMap: options.sourcemap,
      sourceMapIncludeSources: options.sourcemap,
      quietDeps: true,
      importers: [
        {
          findFileUrl: (url, options: FileImporterWithRequestContextOptions) =>
            resolutionCache.getOrCreate(url, async () => {
              const result = await resolveUrl(url, options);
              if (result.path) {
                return pathToFileURL(result.path);
              }

              // Check for package deep imports
              const { packageName, pathSegments } = parsePackageName(url);

              // Caching package root locations is particularly beneficial for `@material/*` packages
              // which extensively use deep imports.
              const packageRoot = await packageRootCache.getOrCreate(packageName, async () => {
                // Use the required presence of a package root `package.json` file to resolve the location
                const packageResult = await resolveUrl(packageName + '/package.json', options);

                return packageResult.path ? dirname(packageResult.path) : null;
              });

              // Package not found could be because of an error or the specifier is intended to be found
              // via a later stage of the resolution process (`loadPaths`, etc.).
              // Errors are reported after the full completion of the resolution process. Exceptions for
              // not found packages should not be raised here.
              if (packageRoot) {
                return pathToFileURL(join(packageRoot, ...pathSegments));
              }

              // Not found
              return null;
            }),
        },
      ],
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
      contents: sourceMap ? `${css}\n${sourceMapToUrlComment(sourceMap, dirname(filePath))}` : css,
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
