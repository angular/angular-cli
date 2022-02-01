/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { extname } from 'path';

export interface SingleTestTransformLoaderOptions {
  /* list of paths relative to the entry-point */
  files: string[];
  logger?: logging.Logger;
}

export const SingleTestTransformLoader = __filename;

/**
 * This loader transforms the default test file to only run tests
 * for some specs instead of all specs.
 */
export default function loader(
  this: import('webpack').LoaderContext<SingleTestTransformLoaderOptions>,
  source: string,
): string {
  const { files } = this.getOptions();

  const imports = files
    .map((path) => `require('./${path.replace('.' + extname(path), '')}');`)
    .join('\n');

  return `${source}\n${imports}`;
}
