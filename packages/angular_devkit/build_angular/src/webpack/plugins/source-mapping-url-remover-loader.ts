/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export const SourceMappingUrlRemoverLoaderPath = __filename;

/**
 * This loader is used to remove the `//# sourceMappingURL=` comment from individual modules.
 * Webpack will not remove these comments when the chunk that these mules are in, are excluded from
 * `SourceMapDevToolPlugin`.
 */
export default function (
  this: import('webpack').loader.LoaderContext,
  content: string,
  // Source map types are broken in the webpack type definitions
  // tslint:disable-next-line: no-any
  map: any,
): void {
  let source = content;
  if (!map) {
    const position = content.lastIndexOf('//# sourceMappingURL=');
    if (position >= 0) {
      source = content.substring(0, position);
    }
  }

  this.callback(null, source, map);

  return;
}
