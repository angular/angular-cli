/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { parse } from 'node:url';
import { SchematicContext, Source } from '../engine/interface';

export function url(urlString: string): Source {
  const url = parse(urlString);

  return (context: SchematicContext) => context.engine.createSourceFromUrl(url, context)(context);
}
