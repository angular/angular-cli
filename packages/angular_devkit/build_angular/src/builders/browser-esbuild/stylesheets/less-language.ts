/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { OnLoadResult, PluginBuild } from 'esbuild';
import { readFile } from 'node:fs/promises';
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
    return compileString(data, file, options, build.resolve.bind(build));
  },
});

async function compileString(
  data: string,
  filename: string,
  options: StylesheetPluginOptions,
  resolver: PluginBuild['resolve'],
): Promise<OnLoadResult> {
  const less = (lessPreprocessor ??= (await import('less')).default);

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
    const result = await less.render(data, {
      filename,
      paths: options.includePaths,
      plugins: [resolverPlugin],
      rewriteUrls: 'all',
      sourceMap: options.sourcemap
        ? {
            sourceMapFileInline: true,
            outputSourceFiles: true,
          }
        : undefined,
    } as Less.Options);

    return {
      contents: result.css,
      loader: 'css',
      watchFiles: [filename, ...result.imports],
    };
  } catch (error) {
    if (isLessException(error)) {
      return {
        errors: [
          {
            text: error.message,
            location: {
              file: error.filename,
              line: error.line,
              column: error.column,
              // Middle element represents the line containing the error
              lineText: error.extract && error.extract[Math.trunc(error.extract.length / 2)],
            },
          },
        ],
        loader: 'css',
      };
    }

    throw error;
  }
}
