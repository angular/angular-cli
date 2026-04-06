/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Plugin } from 'esbuild';

/**
 * Creates an esbuild plugin that prepends the publicPath (deploy-url) to file loader
 * output paths in JavaScript bundles. This is done as a targeted post-process step
 * to avoid setting esbuild's global `publicPath` option which would also affect
 * code-splitting chunk paths.
 */
export function createFileLoaderPublicPathPlugin(publicPath: string): Plugin {
  return {
    name: 'angular-file-loader-public-path',
    setup(build) {
      build.onEnd((result) => {
        if (!result.metafile || !result.outputFiles) {
          return;
        }

        // Collect relative paths of file loader assets from the metafile.
        // These are output entries that are not JS, CSS, or sourcemap files.
        const assetPaths: string[] = [];
        for (const outputPath of Object.keys(result.metafile.outputs)) {
          if (
            !outputPath.endsWith('.js') &&
            !outputPath.endsWith('.css') &&
            !outputPath.endsWith('.map')
          ) {
            assetPaths.push(outputPath);
          }
        }

        if (assetPaths.length === 0) {
          return;
        }

        // Ensure publicPath ends with a separator for correct URL joining.
        const normalizedPublicPath = publicPath.endsWith('/') ? publicPath : publicPath + '/';

        // Update JS output files to prepend publicPath to file loader asset references.
        // esbuild references these assets as "./<assetPath>" in the JS output.
        for (const outputFile of result.outputFiles) {
          if (!outputFile.path.endsWith('.js')) {
            continue;
          }

          let text = outputFile.text;
          let modified = false;

          for (const assetPath of assetPaths) {
            const originalRef = './' + assetPath;
            const updatedRef = normalizedPublicPath + assetPath;

            if (text.includes(originalRef)) {
              text = text.replaceAll(originalRef, updatedRef);
              modified = true;
            }
          }

          if (modified) {
            outputFile.contents = new TextEncoder().encode(text);
          }
        }
      });
    },
  };
}
