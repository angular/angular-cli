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
    'requiredKey': 1,
  };

  registry.addSchema('', schema);
  const v = (new serializers.JavascriptSerializer()).serialize('', registry)(value);

  expect(v.requiredKey).toBe(1);
  expect(() => delete v.requiredKey).toThrow();

  expect(v.stringKeyDefault).toBe('defaultValue');
  v.stringKeyDefault = 'hello';
  expect(v.stringKeyDefault).toBe('hello');
  delete v.stringKeyDefault;
  expect(v.stringKeyDefault).toBe('defaultValue');

  expect(v.objectKey1).toBe(undefined);
  v.objectKey1 = { stringKey: 'str' };
  expect(v.objectKey1.stringKey).toBe('str');

  expect(v.objectKey1.objectKey).toBe(undefined);
  v.objectKey1.objectKey = { stringKey: 'str2' };
  expect(v.objectKey1.objectKey.stringKey).toBe('str2');

  expect(Object.keys(v.objectKey1)).toEqual(['stringKey', 'stringKeyDefault', 'objectKey']);
}


export function accessUndefined(registry: schema.JsonSchemaRegistry, schema: any) {
  const value = {
    'requiredKey': 1,
  };

  registry.addSchema('', schema);
  const v = (new serializers.JavascriptSerializer({
    allowAccessUndefinedObjects: true,
  })).serialize('', registry)(value);

  // Access an undefined property.
  v.objectKey1.stringKey = 'hello';
  expect(v.objectKey1).not.toBe(undefined);
  expect(v.objectKey1.stringKey).toBe('hello');
  expect(v.objectKey1.numberKey).toBe(undefined);
  v.objectKey1.stringKey = undefined;
  expect(v.objectKey1.stringKey).toBe(undefined);

  expect(v.stringKeyDefault).toBe('defaultValue');
  expect(v.objectKey1.stringKeyDefault).toBe('defaultValue2');
}
