/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, isJsonArray, isJsonObject } from '../interface';
import { JsonSchema } from './schema';


const allTypes = ['string', 'integer', 'number', 'object', 'array', 'boolean', 'null'];

export function getTypesOfSchema(schema: JsonSchema): Set<string> {
  if (!schema) {
    return new Set();
  }
  if (schema === true) {
    return new Set(allTypes);
  }

  let potentials: Set<string>;
  if (typeof schema.type === 'string') {
    potentials = new Set([schema.type]);
  } else if (Array.isArray(schema.type)) {
    potentials = new Set(schema.type as string[]);
  } else if (isJsonArray(schema.enum)) {
    potentials = new Set();

    // Gather the type of each enum values, and use that as a starter for potential types.
    for (const v of schema.enum) {
      switch (typeof v) {
        case 'string':
        case 'number':
        case 'boolean':
          potentials.add(typeof v);
          break;

        case 'object':
          if (Array.isArray(v)) {
            potentials.add('array');
          } else if (v === null) {
            potentials.add('null');
          } else {
            potentials.add('object');
          }
          break;
      }
    }
  } else {
    potentials = new Set(allTypes);
  }

  if (isJsonObject(schema.not)) {
    const notTypes = getTypesOfSchema(schema.not);
    potentials = new Set([...potentials].filter(p => !notTypes.has(p)));
  }

  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      const types = getTypesOfSchema(sub as JsonObject);
      potentials = new Set([...potentials].filter(p => types.has(p)));
    }
  }

  if (Array.isArray(schema.oneOf)) {
    let options = new Set<string>();
    for (const sub of schema.oneOf) {
      const types = getTypesOfSchema(sub as JsonObject);
      options = new Set([...options, ...types]);
    }
    potentials = new Set([...potentials].filter(p => options.has(p)));
  }

  if (Array.isArray(schema.anyOf)) {
    let options = new Set<string>();
    for (const sub of schema.anyOf) {
      const types = getTypesOfSchema(sub as JsonObject);
      options = new Set([...options, ...types]);
    }
    potentials = new Set([...potentials].filter(p => options.has(p)));
  }

  if (schema.properties) {
    potentials.add('object');
  } else if (schema.items) {
    potentials.add('array');
  }

  return potentials;
}
