/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { OnLoadResult, PartialMessage, PartialNote, ResolveResult } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { CanonicalizeContext, CompileResult, Exception, Syntax } from 'sass';
import type { SassWorkerImplementation } from '../../sass/sass-service';
import { MemoryCache } from '../cache';
import { StylesheetLanguage, StylesheetPluginOptions } from './stylesheet-plugin-factory';

let sassWorkerPool: SassWorkerImplementation | undefined;
let sassWorkerPoolPromise: Promise<SassWorkerImplementation> | undefined;

function isSassException(error: unknown): error is Exception {
  return !!error && typeof error === 'object' && 'sassMessage' in error;
}

export function shutdownSassWorkerPool(): void {
  if (sassWorkerPool) {
    void sassWorkerPool.close();
    sassWorkerPool = undefined;
  } else if (sassWorkerPoolPromise) {
    void sassWorkerPoolPromise.then(shutdownSassWorkerPool);
  }
  sassWorkerPoolPromise = undefined;
}

export const SassStylesheetLanguage = Object.freeze<StylesheetLanguage>({
  name: 'sass',
  componentFilter: /^s[ac]ss;/,
  fileFilter: /\.s[ac]ss$/,
  process(data, file, format, options, build) {
    const syntax = format === 'sass' ? 'indented' : 'scss';
    const resolveUrl = async (url: string, options: CanonicalizeContext) => {
      let resolveDir = build.initialOptions.absWorkingDir;
      if (options.containingUrl) {
        resolveDir = dirname(fileURLToPath(options.containingUrl));
      }

      const result = await build.resolve(url, {
        kind: 'import-rule',
        resolveDir,
      });

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

async function compileString(
  data: string,
  filePath: string,
  syntax: Syntax,
  options: StylesheetPluginOptions,
  resolveUrl: (url: string, options: CanonicalizeContext) => Promise<ResolveResult>,
): Promise<OnLoadResult> {
  // Lazily load Sass when a Sass file is found
  if (sassWorkerPool === undefined) {
    if (sassWorkerPoolPromise === undefined) {
      sassWorkerPoolPromise = import('../../sass/sass-service').then(
        (sassService) => new sassService.SassWorkerImplementation(true),
      );
    }
    sassWorkerPool = await sassWorkerPoolPromise;
  }

  // Cache is currently local to individual compile requests.
  // Caching follows Sass behavior where a given url will always resolve to the same value
  // regardless of its importer's path.
  // A null value indicates that the cached resolution attempt failed to find a location and
  // later stage resolution should be attempted. This avoids potentially expensive repeat
  // failing resolution attempts.
  const resolutionCache = new MemoryCache<URL | null>();
  const packageRootCache = new MemoryCache<string | null>();
  const warnings: PartialMessage[] = [];
  const { silenceDeprecations, futureDeprecations, fatalDeprecations } = options.sass ?? {};

  try {
    const { css, sourceMap, loadedUrls } = await sassWorkerPool.compileStringAsync(data, {
      url: pathToFileURL(filePath),
      style: 'expanded',
      syntax,
      loadPaths: options.includePaths,
      sourceMap: options.sourcemap,
      sourceMapIncludeSources: options.sourcemap,
      silenceDeprecations,
      fatalDeprecations,
      futureDeprecations,
      quietDeps: true,
      importers: [
        {
          findFileUrl: (url, options) =>
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
        warn: (text, { deprecation, stack, span }) => {
          const notes: PartialNote[] = [];
          if (deprecation) {
            notes.push({ text });
          }
          if (stack && !span) {
            notes.push({ text: stack });
          }

          warnings.push({
            text: deprecation ? 'Deprecation' : text,
            location: span && {
              file: span.url && fileURLToPath(span.url),
              lineText: span.context,
              // Sass line numbers are 0-based while esbuild's are 1-based
              line: span.start.line + 1,
              column: span.start.column,
            },
            notes,
          });
        },
      },
    });

    return {
      loader: 'css',
      contents: sourceMap ? `${css}\n${sourceMapToUrlComment(sourceMap)}` : css,
      watchFiles: loadedUrls.map((url) => fileURLToPath(url)),
      warnings,
    };
  } catch (error) {
    if (isSassException(error)) {
      const fileWithError = error.span.url ? fileURLToPath(error.span.url) : undefined;

      const watchFiles = [filePath, ...extractFilesFromStack(error.sassStack)];
      if (fileWithError) {
        watchFiles.push(fileWithError);
      }

      return {
        loader: 'css',
        errors: [
          {
            text: error.message,
          },
        ],
        warnings,
        watchFiles,
      };
    }

    throw error;
  }
}

function sourceMapToUrlComment(sourceMap: Exclude<CompileResult['sourceMap'], undefined>): string {
  const urlSourceMap = Buffer.from(JSON.stringify(sourceMap), 'utf-8').toString('base64');

  return `/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${urlSourceMap} */`;
}

function* extractFilesFromStack(stack: string): Iterable<string> {
  const lines = stack.split('\n');
  const cwd = process.cwd();

  // Stack line has format of "<file> <location> <identifier>"
  for (const line of lines) {
    const segments = line.split(' ');
    if (segments.length < 3) {
      break;
    }

    // Extract path from stack line.
    // Paths may contain spaces. All segments before location are part of the file path.
    let path = '';
    let index = 0;
    while (!segments[index].match(/\d+:\d+/)) {
      path += segments[index++];
    }

    if (path) {
      // Stack paths from dart-sass are relative to the current working directory (not input file or workspace root)
      yield join(cwd, path);
    }
  }
}
