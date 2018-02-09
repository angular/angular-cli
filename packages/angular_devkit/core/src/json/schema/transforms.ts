/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonArray, JsonObject, JsonValue } from '..';
import { JsonPointer } from './visitor';


export function addUndefinedDefaults(
  value: JsonValue | undefined,
  _pointer: JsonPointer,
  schema?: JsonObject,
  _root?: JsonObject | JsonArray,
): JsonValue | undefined {
  if (value === undefined && schema) {
    if (schema.items || schema.type == 'array') {
      return [];
    }
    if (schema.properties || schema.type == 'object') {
      const newValue: JsonObject = {};
      for (const propName of Object.getOwnPropertyNames(schema.properties || {})) {
        newValue[propName] = undefined as any;  // tslint:disable-line:no-any
      }

      return newValue;
    }
  } else if (schema
             && typeof value == 'object' && value
             && (schema.properties || schema.type == 'object')
  ) {
    for (const propName of Object.getOwnPropertyNames(schema.properties || {})) {
      (value as JsonObject)[propName] = (propName in value)
        ? (value as JsonObject)[propName]
        : undefined as any;  // tslint:disable-line:no-any
    }
  }

  return value;
}
