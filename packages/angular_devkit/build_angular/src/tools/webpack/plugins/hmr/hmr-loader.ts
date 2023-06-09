/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join } from 'path';

export const HmrLoader = __filename;
const hmrAcceptPath = join(__dirname, './hmr-accept.js').replace(/\\/g, '/');

export default function localizeExtractLoader(
  this: import('webpack').LoaderContext<{}>,
  content: string,
  map: Parameters<import('webpack').LoaderDefinitionFunction>[1],
) {
  const source = `${content}

  // HMR Accept Code
  import ngHmrAccept from '${hmrAcceptPath}';
  ngHmrAccept(module);
  `;

  this.callback(null, source, map);

  return;
}
