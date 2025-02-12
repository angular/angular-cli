/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Location, OnLoadResult, PluginBuild } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { StylesheetLanguage, StylesheetPluginOptions } from './stylesheet-plugin-factory';

/**
 * The lazy-loaded instance of the less stylesheet preprocessor.
 * It is only imported and initialized if a less stylesheet is used.
 */
let lessPreprocessor: typeof import('less') | undefined;

interface LessException extends Error {
  filename: string;
  line: number;
  column: number;
  extract?: string[];
}

function isLessException(error: unknown): error is LessException {
  return !!error && typeof error === 'object' && 'column' in error;
}

export const LessStylesheetLanguage = Object.freeze<StylesheetLanguage>({
  name: 'less',
  componentFilter: /^less;/,
  fileFilter: /\.less$/,
  process(data, file, _, options, build) {
    return compileString(
      data,
      file,
      options,
      build.resolve.bind(build),
      /* unsafeInlineJavaScript */ false,
    );
  },
});

async function compileString(
  data: string,
  filename: string,
  options: StylesheetPluginOptions,
  resolver: PluginBuild['resolve'],
  unsafeInlineJavaScript: boolean,
): Promise<OnLoadResult> {
  try {
    lessPreprocessor ??= (await import('less')).default;
  } catch {
    return {
      errors: [
        {
          text: 'Unable to load the "less" stylesheet preprocessor.',
          location: null,
          notes: [
            {
              text:
                'Ensure that the "less" Node.js package is installed within the project. ' +
                "If not present, installation via the project's package manager should resolve the error.",
            },
          ],
        },
      ],
    };
  }
  const less = lessPreprocessor;

  const resolverPlugin: Less.Plugin = {
    install({ FileManager }, pluginManager): void {
      const resolverFileManager = new (class extends FileManager {
        override supportsSync(): boolean {
          return false;
        }

        override supports(): boolean {
          return true;
        }

        override async loadFile(
          filename: string,
          currentDirectory: string,
          options: Less.LoadFileOptions,
          environment: Less.Environment,
        ): Promise<Less.FileLoadResult> {
          // Attempt direct loading as a relative path to avoid resolution overhead
          try {
            return await super.loadFile(filename, currentDirectory, options, environment);
          } catch (error) {
            // Attempt a full resolution if not found
            const fullResult = await resolver(filename, {
              kind: 'import-rule',
              resolveDir: currentDirectory,
            });
            if (fullResult.path) {
              return {
                filename: fullResult.path,
                contents: await readFile(fullResult.path, 'utf-8'),
              };
            }
            // Otherwise error by throwing the failing direct result
            throw error;
          }
        }
      })();

      pluginManager.addFileManager(resolverFileManager);
    },
  };

  try {
    const { imports, map, css } = await less.render(data, {
      filename,
      paths: options.includePaths,
      plugins: [resolverPlugin],
      rewriteUrls: 'all',
      javascriptEnabled: unsafeInlineJavaScript,
      sourceMap: options.sourcemap
        ? {
            sourceMapFileInline: false,
            outputSourceFiles: true,
          }
        : undefined,
    } as Less.Options);

    return {
      contents: options.sourcemap ? `${css}\n${sourceMapToUrlComment(map)}` : css,
      loader: 'css',
      watchFiles: [filename, ...imports],
    };
  } catch (error) {
    if (isLessException(error)) {
      const location = convertExceptionLocation(error);

      // Retry with a warning for less files requiring the deprecated inline JavaScript option
      if (error.message.includes('Inline JavaScript is not enabled.')) {
        const withJsResult = await compileString(
          data,
          filename,
          options,
          resolver,
          /* unsafeInlineJavaScript */ true,
        );
        withJsResult.warnings = [
          {
            text: 'Deprecated inline execution of JavaScript has been enabled ("javascriptEnabled")',
            location,
            notes: [
              {
                location: null,
                text: 'JavaScript found within less stylesheets may be executed at build time. [https://lesscss.org/usage/#less-options]',
              },
              {
                location: null,
                text: 'Support for "javascriptEnabled" may be removed from the Angular CLI starting with Angular v19.',
              },
            ],
          },
        ];

        return withJsResult;
      }

      return {
        errors: [
          {
            text: error.message,
            location,
          },
        ],
        loader: 'css',
        watchFiles: location.file ? [filename, location.file] : [filename],
      };
    }

    throw error;
  }
}

function convertExceptionLocation(exception: LessException): Partial<Location> {
  return {
    file: exception.filename,
    line: exception.line,
    column: exception.column,
    // Middle element represents the line containing the exception
    lineText: exception.extract && exception.extract[Math.trunc(exception.extract.length / 2)],
  };
}

function sourceMapToUrlComment(sourceMap: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = JSON.parse(sourceMap) as Record<string, any>;
  // Using file URLs instead of paths ensures that esbuild correctly resolves the source map.
  // https://github.com/evanw/esbuild/issues/4070
  // https://github.com/evanw/esbuild/issues/4075
  map.sources = map.sources.map((source: string) =>
    source && isAbsolute(source) ? pathToFileURL(source).href : source,
  );

  const urlSourceMap = Buffer.from(JSON.stringify(map), 'utf-8').toString('base64');

  return `/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${urlSourceMap} */`;
}
