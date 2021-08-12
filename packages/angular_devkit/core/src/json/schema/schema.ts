/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonObject, JsonValue, isJsonObject } from '../utils';

/**
 * A specialized interface for JsonSchema (to come). JsonSchemas are also JsonObject.
 *
 * @public
 */
export type JsonSchema = JsonObject | boolean;

export function isJsonSchema(value: unknown): value is JsonSchema {
  return isJsonObject(value as JsonValue) || value === false || value === true;
}

/**
 * Return a schema that is the merge of all subschemas, ie. it should validate all the schemas
 * that were passed in. It is possible to make an invalid schema this way, e.g. by using
 * `mergeSchemas({ type: 'number' }, { type: 'string' })`, which will never validate.
 * @param schemas All schemas to be merged.
 */
export function mergeSchemas(...schemas: (JsonSchema | undefined)[]): JsonSchema {
  return schemas.reduce<JsonSchema>((prev, curr) => {
    if (curr === undefined) {
      return prev;
    }

    if (prev === false || curr === false) {
      return false;
    } else if (prev === true) {
      return curr;
    } else if (curr === true) {
      return prev;
    } else if (Array.isArray(prev.allOf)) {
      if (Array.isArray(curr.allOf)) {
        return { ...prev, allOf: [...prev.allOf, ...curr.allOf] };
      } else {
        return { ...prev, allOf: [...prev.allOf, curr] };
      }
    } else if (Array.isArray(curr.allOf)) {
      return { ...prev, allOf: [prev, ...curr.allOf] };
    } else {
      return { ...prev, allOf: [prev, curr] };
    }
  }, true);
}
