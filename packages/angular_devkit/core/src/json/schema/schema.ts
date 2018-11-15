/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { clean } from '../../utils';
import { JsonObject, isJsonObject } from '../interface';

/**
 * A specialized interface for JsonSchema (to come). JsonSchemas are also JsonObject.
 *
 * @public
 */
export type JsonSchema = JsonObject | boolean;


// TODO: this should be unknown
// tslint:disable-next-line:no-any
export function isJsonSchema(value: any): value is JsonSchema {
  return isJsonObject(value) || value === false || value === true;
}

/**
 * Return a schema that is the merge of all subschemas, ie. it should validate all the schemas
 * that were passed in. It is possible to make an invalid schema this way, e.g. by using
 * `mergeSchemas({ type: 'number' }, { type: 'string' })`, which will never validate.
 * @param schemas All schemas to be merged.
 */
export function mergeSchemas(...schemas: (JsonSchema | undefined)[]): JsonSchema {
  return clean(schemas).reduce((prev, curr) => {
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
  }, true as JsonSchema);
}
