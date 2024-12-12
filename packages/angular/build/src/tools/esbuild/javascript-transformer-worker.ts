/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import Piscina from 'piscina';
import { BabelTransformOptions, transformWithBabel } from '../babel/transform';

interface JavaScriptTransformRequest extends BabelTransformOptions {
  filename: string;
  data: string | Uint8Array;
}

export default async function transformJavaScript(
  request: JavaScriptTransformRequest,
): Promise<unknown> {
  const { filename, data, ...options } = request;

  const transformedData = await transformWithBabel(filename, data, options);

  // Transfer the data via `move` instead of cloning
  return Piscina.move(transformedData);
}
