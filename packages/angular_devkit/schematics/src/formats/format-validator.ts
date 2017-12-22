/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { schema } from '@angular-devkit/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/mergeMap';


export function formatValidator(
  data: Object,
  dataSchema: Object,
  formats: schema.SchemaFormat[],
): Observable<schema.SchemaValidatorResult> {
  const registry = new schema.CoreSchemaRegistry();

  for (const format of formats) {
    registry.addFormat(format);
  }

  return registry
    .compile(dataSchema)
    .mergeMap(validator => validator(data));
}
