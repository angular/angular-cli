/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-any non-null-operator no-big-function
import { of as observableOf } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { SchemaFormat } from './interface';
import { CoreSchemaRegistry } from './registry';
import { addUndefinedDefaults } from './transforms';


describe('CoreSchemaRegistry', () => {
  it('works asynchronously', done => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data: any = {};  // tslint:disable-line:no-any

    registry
      .compile({
        properties: {
          bool: { type: 'boolean' },
          str: { type: 'string', default: 'someString' },
          obj: {
            properties: {
              num: { type: 'number' },
              other: { type: 'number', default: 0 },
            },
          },
          tslint: {
            $ref: 'https://json.schemastore.org/tslint#',
          },
        },
      })
      .pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          expect(result.success).toBe(true);
          expect(data.obj.num).toBeUndefined();
          expect(data.tslint).not.toBeUndefined();
        }),
      )
      .toPromise().then(done, done.fail);
  });

  it('supports pre transforms', done => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data: any = {};  // tslint:disable-line:no-any

    registry.addPreTransform((data, ptr) => {
      if (ptr == '/') {
        return { str: 'string' };
      }

      return data;
    });

    registry
      .compile({
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
      })
      .pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          const data = result.data as any;
          expect(result.success).toBe(true);
          expect(data.str).toBe('string');
          expect(data.obj.num).toBeUndefined();
        }),
      )
      .toPromise().then(done, done.fail);
  });

  it('supports local references', done => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data = { numbers: { one: 1 } };

    registry
      .compile({
        properties: {
          numbers: {
            type: 'object',
            additionalProperties: { '$ref': '#/definitions/myRef' },
          },
        },
        definitions: {
          myRef: { type: 'integer' },
        },
      })
      .pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          expect(result.success).toBe(true);
          expect(data.numbers.one).not.toBeUndefined();
        }),
    )
      .toPromise().then(done, done.fail);
  });

  it('fails on invalid additionalProperties', done => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data = { notNum: 'foo' };

    registry
      .compile({
        properties: {
          num: { type: 'number' },
        },
        additionalProperties: false,
      }).pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          expect(result.success).toBe(false);
          expect(result.errors && result.errors[0].message).toContain(
            'should NOT have additional properties');
        }),
    )
      .toPromise().then(done, done.fail);
  });

  it('fails on invalid additionalProperties async', done => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data = { notNum: 'foo' };

    registry
      .compile({
        $async: true,
        properties: {
          num: { type: 'number' },
        },
        additionalProperties: false,
      }).pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          expect(result.success).toBe(false);
          expect(result.errors && result.errors[0].message).toContain(
            'should NOT have additional properties');
          expect(result.errors && result.errors[0].keyword).toBe('additionalProperties');
        }),
      )
      .toPromise().then(done, done.fail);
  });

  it('supports sync format', done => {
    const registry = new CoreSchemaRegistry();
    const data = { str: 'hotdog' };
    const format = {
      name: 'is-hotdog',
      formatter: {
        validate: (str: string) => str === 'hotdog',
      },
    };

    registry.addFormat(format);

    registry
      .compile({
        properties: {
          str: { type: 'string', format: 'is-hotdog' },
        },
      })
      .pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          expect(result.success).toBe(true);
        }),
      )
      .toPromise().then(done, done.fail);
  });

  it('supports async format', done => {
    const registry = new CoreSchemaRegistry();
    const data = { str: 'hotdog' };

    const format: SchemaFormat = {
      name: 'is-hotdog',
      formatter: {
        async: true,
        validate: async (str: string) => str === 'hotdog',
      },
    };

    registry.addFormat(format);

    registry
      .compile({
        $async: true,
        properties: {
          str: { type: 'string', format: 'is-hotdog' },
        },
      })
      .pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          expect(result.success).toBe(true);
        }),
      )
      .toPromise().then(done, done.fail);
  });

  it('shows dataPath and message on error', done => {
    const registry = new CoreSchemaRegistry();
    const data = { hotdot: 'hotdog', banana: 'banana' };
    const format: SchemaFormat = {
      name: 'is-hotdog',
      formatter: {
        async: false,
        validate: (str: string) => str === 'hotdog',
      },
    };

    registry.addFormat(format);

    registry
      .compile({
        properties: {
          hotdot: { type: 'string', format: 'is-hotdog' },
          banana: { type: 'string', format: 'is-hotdog' },
        },
      })
      .pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          expect(result.success).toBe(false);
          expect(result.errors && result.errors[0]).toBeTruthy();
          expect(result.errors && result.errors[0].keyword).toBe('format');
          expect(result.errors && result.errors[0].instancePath).toBe('.banana');
          expect(result.errors && (result.errors[0].params as any).format).toBe('is-hotdog');
        }),
      )
      .toPromise().then(done, done.fail);
  });

  it('supports smart defaults', done => {
    const registry = new CoreSchemaRegistry();
    const data: any = {
      arr: [{}],
    };

    registry.addSmartDefaultProvider('test', (schema) => {
      expect(schema).toEqual({
        $source: 'test',
      });

      return true;
    });
    registry.addSmartDefaultProvider('test2', (schema) => {
      expect(schema).toEqual({
        $source: 'test2',
        blue: 'yep',
      });

      return schema['blue'];
    });
    registry.addSmartDefaultProvider('test3', () => {
      return [ 1, 2, 3 ];
    });

    registry
      .compile({
        properties: {
          bool: {
            $ref: '#/definitions/example',
          },
          arr: {
            items: {
              properties: {
                'test': {
                  $ref: '#/definitions/other',
                },
              },
            },
          },
          arr2: {
            $ref: '#/definitions/test3',
          },
          obj: {
            properties: {
              deep: {
                properties: {
                  arr: {
                    $ref: '#/definitions/test3',
                  },
                },
              },
            },
          },
        },
        definitions: {
          example: {
            type: 'boolean',
            $default: {
              $source: 'test',
            },
          },
          other: {
            type: 'string',
            $default: {
              $source: 'test2',
              blue: 'yep',
            },
          },
          test3: {
            type: 'array',
            $default: {
              $source: 'test3',
            },
          },
        },
      })
      .pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          expect(result.success).toBe(true);
          expect(data.bool).toBe(true);
          expect(data.arr[0].test).toBe('yep');
          expect(data.arr2).toEqual([1, 2, 3]);
          expect(data.obj.deep.arr).toEqual([1, 2, 3]);
        }),
      )
      .toPromise().then(done, done.fail);
  });

  it('works with true as a schema and post-transforms', async () => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data: any = { a: 1, b: 2 };  // tslint:disable-line:no-any

    const validate = await registry.compile(true).toPromise();
    const result = await validate(data).toPromise();

    expect(result.success).toBe(true);
    expect(result.data).toBe(data);
  });

  it('adds deprecated options usage', done => {
    const registry = new CoreSchemaRegistry();
    const deprecatedMessages: string[] = [];
    registry.useXDeprecatedProvider(m => deprecatedMessages.push(m));

    const data = {
      foo: true,
      bar: true,
      bat: true,
    };

    registry
      .compile({
        properties: {
          foo: { type: 'boolean', 'x-deprecated': 'Use bar instead.' },
          bar: { type: 'boolean', 'x-deprecated': true },
          buz: { type: 'boolean', 'x-deprecated': true },
          bat: { type: 'boolean', 'x-deprecated': false },
        },
      })
      .pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          expect(deprecatedMessages.length).toBe(2);
          expect(deprecatedMessages[0]).toBe('Option "foo" is deprecated: Use bar instead.');
          expect(deprecatedMessages[1]).toBe('Option "bar" is deprecated.');
          expect(result.success).toBe(true, result.errors);
        }),
      )
      .toPromise().then(done, done.fail);
  });
});
