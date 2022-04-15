/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Plugin, PluginBuild } from 'esbuild';
import type { LegacyResult } from 'sass';
import { SassWorkerImplementation } from '../../sass/sass-service';

export function createSassPlugin(options: { sourcemap: boolean; includePaths?: string[] }): Plugin {
  return {
    name: 'angular-sass',
    setup(build: PluginBuild): void {
      let sass: SassWorkerImplementation;

      build.onStart(() => {
        sass = new SassWorkerImplementation();
      });

      build.onEnd(() => {
        sass?.close();
      });

      build.onLoad({ filter: /\.s[ac]ss$/ }, async (args) => {
        const result = await new Promise<LegacyResult>((resolve, reject) => {
          sass.render(
            {
              file: args.path,
              includePaths: options.includePaths,
              indentedSyntax: args.path.endsWith('.sass'),
              outputStyle: 'expanded',
              sourceMap: options.sourcemap,
              sourceMapContents: options.sourcemap,
              sourceMapEmbed: options.sourcemap,
              quietDeps: true,
            },
            (error, result) => {
              if (error) {
                reject(error);
              }
              if (result) {
                resolve(result);
              }
            },
          );
        });

        return {
          contents: result.css,
          loader: 'css',
          watchFiles: result.stats.includedFiles,
        };
      });
    },
  };
}
