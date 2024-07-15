/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Loader, PartialMessage, Plugin } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { assertIsError } from '../../utils/error';
import { MemoryCache } from './cache';

const SUPPORTED_LOADERS: Loader[] = ['binary', 'file', 'text'];

export function createLoaderImportAttributePlugin(): Plugin {
  return {
    name: 'angular-loader-import-attributes',
    setup(build) {
      let imageSizer: typeof import('image-size') | undefined;
      const imageDataCache = new MemoryCache<Uint8Array>();

      build.onEnd(() => {
        imageDataCache.clear();
      });

      build.onLoad({ filter: /./ }, async (args) => {
        const loader = args.with['loader'] as Loader | 'image-file' | undefined;
        if (!loader) {
          return undefined;
        }

        // Loader type that provides image metadata as named exports in addition to `file` loader behavior.
        // This is used by the AOT compiler to support the optimized image functionality.
        if (loader === 'image-file') {
          let contents = `import imagePath from ${JSON.stringify('./' + basename(args.path))} with { loader: "file" }\n`;
          contents += 'export default imagePath;\n';

          // Calculate width and height
          imageSizer ??= await import('image-size');

          // The image data is required to determine the dimensions and is cached in the plugin to minimize FS access
          const imageData = await imageDataCache.getOrCreate(
            args.path,
            async () => await readFile(args.path),
          );
          let warnings: PartialMessage[] | undefined;
          try {
            const result = imageSizer.imageSize(imageData);
            if (typeof result.height === 'number' && typeof result.width === 'number') {
              contents += `const width = ${result.width};\nconst height = ${result.height};\nexport { width, height }\n`;
            } else {
              warnings = [
                {
                  text: 'Image dimensions unavailable within file',
                },
              ];
            }
          } catch (error) {
            assertIsError(error);

            return {
              errors: [{ text: 'Unable to analyze image file', notes: [{ text: error.message }] }],
            };
          }

          return {
            contents,
            resolveDir: dirname(args.path),
            loader: 'js',
            warnings,
          };
        }

        if (!SUPPORTED_LOADERS.includes(loader)) {
          return {
            errors: [
              {
                text: 'Unsupported loader import attribute',
                notes: [
                  { text: 'Attribute value must be one of: ' + SUPPORTED_LOADERS.join(', ') },
                ],
              },
            ],
          };
        }

        // Use image data cache if present to avoid repeat file access for `image-file` loader types
        let contents = await imageDataCache.get(args.path);
        contents ??= await readFile(args.path);

        return {
          contents,
          loader,
        };
      });
    },
  };
}
