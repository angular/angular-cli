/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonObject, JsonValue, schema } from '@angular-devkit/core';

export async function formatValidator(
  data: JsonValue,
  dataSchema: JsonObject,
  formats: schema.SchemaFormat[],
): Promise<schema.SchemaValidatorResult> {
  const registry = new schema.CoreSchemaRegistry();

  for (const format of formats) {
    registry.addFormat(format);
  }

  const validator = await registry.compile(dataSchema);

  return validator(data);
}
