/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, from } from 'rxjs';
import { JsonObject, JsonValue } from '..';
import { visitJson } from './visitor';


function syncObs<T>(obs: Observable<T>): T {
  let value: T;
  let set = false;

  obs
    .forEach(x => {
      if (set) {
        throw new Error('Multiple value.');
      }
      value = x;
      set = true;
    })
    .catch(err => fail(err));

  if (!set) {
    throw new Error('Async observable.');
  }

  return value !;  // tslint:disable-line:no-non-null-assertion
}


describe('visitJson', () => {
  it('works to replace the root', () => {
    const json = { a: 1 };
    const newJson = {};

    const result = syncObs(visitJson(json, () => newJson));
    expect(result).toBe(newJson);
  });

  it('goes through recursively if replacing root', () => {
    const json = { a: 1 };
    const newJson = { b: 'hello ' };

    const result = syncObs(visitJson(json, value => {
      if (typeof value == 'object') {
        return newJson;
      } else {
        return value + 'world';
      }
    }));
    expect(result).toEqual({ b: 'hello world' });
    expect(newJson).toEqual({ b: 'hello world' });
  });

  it('goes through all replacements recursively', () => {
    const json = { a: 1 };
    const newJson = { b: '' };
    const newJson2 = { c: [] };
    const newJson3 = [1, 2, 3];

    const result = syncObs(visitJson(json, (value, ptr) => {
      if (ptr.endsWith('a')) {
        return newJson;
      } else if (ptr.endsWith('b')) {
        return newJson2;
      } else if (ptr.endsWith('c')) {
        return newJson3;
      } else if (typeof value == 'number') {
        return '_' + value;
      } else if (ptr == '/') {
        return value;
      } else {
        return 'abc';
      }
    }));

    expect(result).toEqual({ a: { b: { c: ['_1', '_2', '_3'] } } });
  });

  it('goes through all replacements recursively (async)', done => {
    const json = { a: 1 };
    const newJson = { b: '' };
    const newJson2 = { c: [] };
    const newJson3 = [1, 2, 3];

    visitJson(json, (value, ptr) => {
      if (ptr.endsWith('a')) {
        return from(Promise.resolve(newJson));
      } else if (ptr.endsWith('b')) {
        return from(Promise.resolve(newJson2));
      } else if (ptr.endsWith('c')) {
        return from(Promise.resolve(newJson3));
      } else if (typeof value == 'number') {
        return from(Promise.resolve('_' + value));
      } else if (ptr == '/') {
        return from(Promise.resolve(value));
      } else {
        return from(Promise.resolve('abc'));
      }
    }).toPromise().then(
      result => {
        expect(result).toEqual({ a: { b: { c: ['_1', '_2', '_3'] } } });
        done();
      },
      done.fail,
    );
  });

  it('works with schema', () => {
    const schema = {
      properties: {
        bool: { type: 'boolean' },
        str: { type: 'string', default: 'someString' },
        obj: {
          properties: {
            num: { type: 'number' },
            other: { type: 'number', default: 0 },
          },
        },
      },
    };

    const allPointers: { [ptr: string]: JsonObject | undefined } = {};
    function visitor(value: JsonValue, ptr: string, schema?: JsonObject) {
      expect(allPointers[ptr]).toBeUndefined();
      allPointers[ptr] = schema;

      return value;
    }

    const json = {
      bool: true,
      str: 'hello',
      obj: {
        num: 1,
      },
    };

    const result = syncObs(visitJson(json, visitor, schema));

    expect(result).toEqual({
      bool: true,
      str: 'hello',
      obj: { num: 1 },
    });
    expect(allPointers).toEqual({
      '/': schema,
      '/bool': schema.properties.bool,
      '/str': schema.properties.str,
      '/obj': schema.properties.obj,
      '/obj/num': schema.properties.obj.properties.num,
    });
  });
});
