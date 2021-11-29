/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { LoaderContext } from 'webpack';

export const DirectAngularResourceLoaderPath = __filename;

export default function (this: LoaderContext<{ esModule?: 'true' | 'false' }>, content: string) {
  const { esModule } = this.getOptions();

  return `${esModule === 'false' ? 'module.exports =' : 'export default'} ${JSON.stringify(
    content,
  )};`;
}
