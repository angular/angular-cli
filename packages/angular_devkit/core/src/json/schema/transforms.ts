/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, JsonValue, isJsonObject } from '../interface';
import { JsonPointer } from './interface';

const allTypes = ['string', 'integer', 'number', 'object', 'array', 'boolean', 'null'];

function findTypes(schema: JsonObject): Set<string> {
  if (!schema) {
    return new Set();
  }

  let potentials: Set<string>;
  if (typeof schema.type === 'string') {
    potentials = new Set([schema.type]);
  } else if (Array.isArray(schema.type)) {
    potentials = new Set(schema.type as string[]);
  } else {
    potentials = new Set(allTypes);
  }

  if (isJsonObject(schema.not)) {
    const notTypes = findTypes(schema.not);
    potentials = new Set([...potentials].filter(p => !notTypes.has(p)));
  }

  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      const types = findTypes(sub as JsonObject);
      potentials = new Set([...potentials].filter(p => types.has(p)));
    }
  }

  if (Array.isArray(schema.oneOf)) {
    let options = new Set<string>();
    for (const sub of schema.oneOf) {
      const types = findTypes(sub as JsonObject);
      options = new Set([...options, ...types]);
    }
    potentials = new Set([...potentials].filter(p => options.has(p)));
  }

  if (Array.isArray(schema.anyOf)) {
    let options = new Set<string>();
    for (const sub of schema.anyOf) {
      const types = findTypes(sub as JsonObject);
      options = new Set([...options, ...types]);
    }
    potentials = new Set([...potentials].filter(p => options.has(p)));
  }

  return potentials;
}

export function addUndefinedDefaults(
  value: JsonValue,
  _pointer: JsonPointer,
  schema?: JsonObject,
): JsonValue {
  if (!schema) {
    return value;
  }

  const types = findTypes(schema);
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

    for (const propName of Object.getOwnPropertyNames(schema.properties)) {
      if (propName in newValue) {
        continue;
      }

      // TODO: Does not currently handle more complex schemas (oneOf/anyOf/etc.)
      const defaultValue = (schema.properties[propName] as JsonObject).default;

      newValue[propName] = defaultValue;
    }

    return newValue;
  }

  return value;
}
