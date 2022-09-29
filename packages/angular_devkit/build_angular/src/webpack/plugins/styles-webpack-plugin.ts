/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import assert from 'assert';
import { pluginName } from 'mini-css-extract-plugin';
import type { Compilation, Compiler } from 'webpack';
import { assertIsError } from '../../utils/error';
import { addError } from '../../utils/webpack-diagnostics';

export interface StylesWebpackPluginOptions {
  preserveSymlinks?: boolean;
  root: string;
  entryPoints: Record<string, string[]>;
}

/**
 * The name of the plugin provided to Webpack when tapping Webpack compiler hooks.
 */
const PLUGIN_NAME = 'styles-webpack-plugin';

export class StylesWebpackPlugin {
  private compilation: Compilation | undefined;

  constructor(private readonly options: StylesWebpackPluginOptions) {}

  apply(compiler: Compiler): void {
    const { entryPoints, preserveSymlinks, root } = this.options;
    const webpackOptions = compiler.options;
    const entry =
      typeof webpackOptions.entry === 'function' ? webpackOptions.entry() : webpackOptions.entry;

    const resolver = compiler.resolverFactory.get('global-styles', {
      conditionNames: ['sass', 'less', 'style'],
      mainFields: ['sass', 'less', 'style', 'main', '...'],
      extensions: ['.scss', '.sass', '.less', '.css'],
      restrictions: [/\.((le|sa|sc|c)ss)$/i],
      preferRelative: true,
      useSyncFileSystemCalls: true,
      symlinks: !preserveSymlinks,
      fileSystem: compiler.inputFileSystem,
    });

    webpackOptions.entry = async () => {
      const entrypoints = await entry;

      for (const [bundleName, paths] of Object.entries(entryPoints)) {
        entrypoints[bundleName] ??= {};
        const entryImport = (entrypoints[bundleName].import ??= []);

        for (const path of paths) {
          try {
            const resolvedPath = resolver.resolveSync({}, root, path);
            if (resolvedPath) {
              entryImport.push(`${resolvedPath}?ngGlobalStyle`);
            } else {
              assert(this.compilation, 'Compilation cannot be undefined.');
              addError(this.compilation, `Cannot resolve '${path}'.`);
            }
          } catch (error) {
            assert(this.compilation, 'Compilation cannot be undefined.');
            assertIsError(error);
            addError(this.compilation, error.message);
          }
        }
      }

      return entrypoints;
    };

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      this.compilation = compilation;
    });
  }
}
