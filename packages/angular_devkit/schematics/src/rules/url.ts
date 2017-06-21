/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {SchematicContext, Source} from '../engine/interface';

import {parse} from 'url';


export function url(urlString: string): Source {
  const url = parse(urlString);
  return (context: SchematicContext) => context.engine.createSourceFromUrl(url)(context);
}
