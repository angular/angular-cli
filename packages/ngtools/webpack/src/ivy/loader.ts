/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as path from 'path';
import { AngularPluginSymbol, FileEmitterCollection } from './symbol';

export function angularWebpackLoader(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  this: any,
  content: string,
  // Source map types are broken in the webpack type definitions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any,
) {
  const callback = this.async();
  if (!callback) {
    throw new Error('Invalid webpack version');
  }

  const fileEmitter = this._compilation[AngularPluginSymbol] as FileEmitterCollection;
  if (typeof fileEmitter !== 'object') {
    if (this.resourcePath.endsWith('.js')) {
      // Passthrough for JS files when no plugin is used
      this.callback(undefined, content, map);

      return;
    }

    callback(new Error('The Angular Webpack loader requires the AngularWebpackPlugin.'));

    return;
  }

  fileEmitter
    .emit(this.resourcePath)
    .then((result) => {
      if (!result) {
        if (this.resourcePath.endsWith('.js')) {
          // Return original content for JS files if not compiled by TypeScript ("allowJs")
          this.callback(undefined, content, map);
        } else {
          // File is not part of the compilation
          const message =
            `${this.resourcePath} is missing from the TypeScript compilation. ` +
            `Please make sure it is in your tsconfig via the 'files' or 'include' property.`;
          callback(new Error(message));
        }

        return;
      }

      result.dependencies.forEach((dependency) => this.addDependency(dependency));

      let resultContent = result.content || '';
      let resultMap;
      if (result.map) {
        resultContent = resultContent.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');
        resultMap = JSON.parse(result.map);
        resultMap.sources = resultMap.sources.map((source: string) =>
          path.join(path.dirname(this.resourcePath), source),
        );
      }

      callback(undefined, resultContent, resultMap);
    })
    .catch((err) => {
      callback(err);
    });
}

export { angularWebpackLoader as default };
