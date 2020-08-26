/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, JsonValue, isJsonObject } from '../interface';
import { JsonPointer } from './interface';
import { JsonSchema } from './schema';
import { getTypesOfSchema } from './utility';

export function addUndefinedDefaults(
  value: JsonValue,
  _pointer: JsonPointer,
  schema?: JsonSchema,
): JsonValue {
  if (schema === true || schema === false) {
    return value;
  }
  if (schema === undefined) {
    return value;
  }

  const types = getTypesOfSchema(schema);
  if (types.size === 0) {
    return value;
  }

  let type;
  if (types.size === 1) {
    // only one potential type
    type = Array.from(types)[0];
  } else if (types.size === 2 && types.has('array') && types.has('object')) {
    // need to create one of them and array is simpler
    type = 'array';
  } else if (schema.properties && types.has('object')) {
    // assume object
    type = 'object';
  } else if (schema.items && types.has('array')) {
    // assume array
    type = 'array';
  } else {
    // anything else needs to be checked by the consumer anyway
    return value;
  }

  if (type === 'array') {
    return value == undefined ? [] : value;
  }

  if (type === 'object') {
    let newValue;
    if (value == undefined) {
      newValue = {} as JsonObject;
    } else if (isJsonObject(value)) {
      newValue = value;
    } else {
      return value;
    }

    if (!isJsonObject(schema.properties)) {
      return newValue;
    }

    for (const [propName, schemaObject] of Object.entries(schema.properties)) {
      if (newValue[propName] !== undefined || propName === '$schema') {
        continue;
      }

      // TODO: Does not currently handle more complex schemas (oneOf/anyOf/etc.)
      const defaultValue = (schemaObject as JsonObject).default;

      newValue[propName] = defaultValue;
    }

    return newValue;
  }

  return value;
}
