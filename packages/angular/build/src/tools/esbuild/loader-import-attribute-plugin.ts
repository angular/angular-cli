/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Loader, Plugin } from 'esbuild';
import { readFile } from 'node:fs/promises';

const SUPPORTED_LOADERS: Loader[] = ['base64', 'binary', 'dataurl', 'file', 'text'];

export function createLoaderImportAttributePlugin(): Plugin {
  return {
    name: 'angular-loader-import-attributes',
    setup(build) {
      build.onLoad({ filter: /./ }, async (args) => {
        const loader = args.with['loader'] as Loader | undefined;
        if (!loader) {
          return undefined;
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

        return {
          contents: await readFile(args.path),
          loader,
        };
      });
    },
  };
}
