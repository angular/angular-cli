/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { pluginName } from 'mini-css-extract-plugin';
import assert from 'node:assert';
import type { Compilation, Compiler } from 'webpack';

import { findTests } from './find-tests';

/**
 * The name of the plugin provided to Webpack when tapping Webpack compiler hooks.
 */
const PLUGIN_NAME = 'angular-find-tests-plugin';

export interface FindTestsPluginOptions {
  include?: string[];
  exclude?: string[];
  workspaceRoot: string;
  projectSourceRoot: string;
}

export class FindTestsPlugin {
  private compilation: Compilation | undefined;

  constructor(private options: FindTestsPluginOptions) {}

  apply(compiler: Compiler): void {
    const {
      include = ['**/*.spec.ts'],
      exclude = [],
      projectSourceRoot,
      workspaceRoot,
    } = this.options;
    const webpackOptions = compiler.options;
    const entry =
      typeof webpackOptions.entry === 'function' ? webpackOptions.entry() : webpackOptions.entry;

    let originalImport: string[] | undefined;

    // Add tests files are part of the entry-point.
    webpackOptions.entry = async () => {
      const specFiles = await findTests(include, exclude, workspaceRoot, projectSourceRoot);
      const entrypoints = await entry;
      const entrypoint = entrypoints['main'];
      if (!entrypoint.import) {
        throw new Error(`Cannot find 'main' entrypoint.`);
      }

      if (specFiles.length) {
        originalImport ??= entrypoint.import;
        entrypoint.import = [...originalImport, ...specFiles];
      } else {
        assert(this.compilation, 'Compilation cannot be undefined.');
        this.compilation
          .getLogger(pluginName)
          .error(`Specified patterns: "${include.join(', ')}" did not match any spec files.`);
      }

      return entrypoints;
    };

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      this.compilation = compilation;
      compilation.contextDependencies.add(projectSourceRoot);
    });
  }
}
