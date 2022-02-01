/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonObject, JsonValue, isJsonArray, isJsonObject } from '../utils';
import { JsonPointer } from './interface';
import { JsonSchema } from './schema';
import { getTypesOfSchema } from './utility';

export function addUndefinedDefaults(
  value: JsonValue,
  _pointer: JsonPointer,
  schema?: JsonSchema,
): JsonValue {
  if (typeof schema === 'boolean' || schema === undefined) {
    return value;
  }

  value ??= schema.default;

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
      if (propName === '$schema' || !isJsonObject(schemaObject)) {
        continue;
      }

      const value = newValue[propName];
      if (value === undefined) {
        newValue[propName] = schemaObject.default;
      } else if (isJsonObject(value)) {
        // Basic support for oneOf and anyOf.
        const propertySchemas = schemaObject.oneOf || schemaObject.anyOf;
        const allProperties = Object.keys(value);
        // Locate a schema which declares all the properties that the object contains.
        const adjustedSchema =
          isJsonArray(propertySchemas) &&
          propertySchemas.find((s) => {
            if (!isJsonObject(s)) {
              return false;
            }

            const schemaType = getTypesOfSchema(s);
            if (schemaType.size === 1 && schemaType.has('object') && isJsonObject(s.properties)) {
              const properties = Object.keys(s.properties);

              return allProperties.every((key) => properties.includes(key));
            }

            return false;
          });

        if (adjustedSchema && isJsonObject(adjustedSchema)) {
          newValue[propName] = addUndefinedDefaults(value, _pointer, adjustedSchema);
        }
      }
    }

    return newValue;
  }

  return value;
}
