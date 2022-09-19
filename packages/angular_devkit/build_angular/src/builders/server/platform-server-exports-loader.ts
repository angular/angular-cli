/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * This loader is needed to add additional exports and is a workaround for a Webpack bug that doesn't
 * allow exports from multiple files in the same entry.
 * @see https://github.com/webpack/webpack/issues/15936.
 */
export default function (
  this: import('webpack').LoaderContext<{}>,
  content: string,
  map: Parameters<import('webpack').LoaderDefinitionFunction>[1],
) {
  const source = `${content}

  // EXPORTS added by @angular-devkit/build-angular
  export { renderModule, ɵSERVER_CONTEXT } from '@angular/platform-server';
  `;

  this.callback(null, source, map);

  return;
}
