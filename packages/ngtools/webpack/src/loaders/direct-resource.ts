/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export const DirectAngularResourceLoaderPath = __filename;

export default function (content: string) {
  return `export default ${JSON.stringify(content)};`;
}
