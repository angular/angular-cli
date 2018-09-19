/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, JsonValue, schema } from '@angular-devkit/core';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';


export function formatValidator(
  data: JsonValue,
  dataSchema: JsonObject,
  formats: schema.SchemaFormat[],
): Observable<schema.SchemaValidatorResult> {
  const registry = new schema.CoreSchemaRegistry();

  for (const format of formats) {
    registry.addFormat(format);
  }

  return registry
    .compile(dataSchema)
    .pipe(mergeMap(validator => validator(data)));
}
