/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
import { schema } from '@angular-devkit/core';

const { serializers } = schema;


export function works(registry: schema.JsonSchemaRegistry, schema: any) {
  const value = {
    'firstName': 'Hans',
    'lastName': 'Larsen',
    'age': 30,
  };

  registry.addSchema('', schema);

  const v = (new serializers.JavascriptSerializer()).serialize('', registry)(value);

  expect(v.firstName).toBe('Hans');
  expect(v.lastName).toBe('Larsen');
  expect(v.age).toBe(30);

  v.age = 10;
  expect(v.age).toBe(10);

  expect(() => v.age = -1).toThrow();
  expect(() => v.age = 'hello').toThrow();
  expect(() => v.age = []).toThrow();
  expect(() => v.age = undefined).not.toThrow();

  expect(() => v.firstName = 0).toThrow();
  expect(() => v.firstName = []).toThrow();
  // This should throw as the value is required.
  expect(() => v.firstName = undefined).toThrow();
}
