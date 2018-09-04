/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, isJsonObject } from '../interface';


const allTypes = ['string', 'integer', 'number', 'object', 'array', 'boolean', 'null'];

export function getTypesOfSchema(schema: JsonObject | true): Set<string> {
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
