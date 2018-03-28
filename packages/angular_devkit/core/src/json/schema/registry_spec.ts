/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
// tslint:disable:non-null-operator
import { of as observableOf } from 'rxjs/observable/of';
import { map, mergeMap } from 'rxjs/operators';
import { CoreSchemaRegistry } from './registry';


describe('CoreSchemaRegistry', () => {
  it('works asynchronously', done => {
    const registry = new CoreSchemaRegistry();
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
            $ref: 'http://json.schemastore.org/tslint#',
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
      .subscribe(done, done.fail);
  });

  it('supports pre transforms', done => {
    const registry = new CoreSchemaRegistry();
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
      .subscribe(done, done.fail);
  });

  it('supports local references', done => {
    const registry = new CoreSchemaRegistry();
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
      .subscribe(done, done.fail);
  });

  it('fails on invalid additionalProperties', done => {
    const registry = new CoreSchemaRegistry();
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
          expect(result.errors).toContain(
            'Data path "" should NOT have additional properties (notNum).');
        }),
    )
      .subscribe(done, done.fail);
  });

  // Synchronous failure is only used internally.
  // If it's meant to be used externally then this test should change to truly be synchronous
  // (i.e. not relyign on the observable).
  it('works synchronously', done => {
    const registry = new CoreSchemaRegistry();
    const data: any = {};  // tslint:disable-line:no-any
    let isDone = false;

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
          expect(result.success).toBe(true);
          expect(data.obj.num).toBeUndefined();
        }),
      )
      .subscribe(() => {
        isDone = true;
      }, done.fail);

    expect(isDone).toBe(true);
    done();
  });

  it('supports sync format', done => {
    const registry = new CoreSchemaRegistry();
    const data = { str: 'hotdog' };
    const format = {
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
          str: { type: 'string', format: 'is-hotdog' },
        },
      })
      .pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          expect(result.success).toBe(true);
        }),
      )
      .subscribe(done, done.fail);
  });

  it('supports async format', done => {
    const registry = new CoreSchemaRegistry();
    const data = { str: 'hotdog' };
    const format = {
      name: 'is-hotdog',
      formatter: {
        async: true,
        validate: (str: string) => observableOf(str === 'hotdog'),
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
      .subscribe(done, done.fail);
  });

  it('shows dataPath and message on error', done => {
    const registry = new CoreSchemaRegistry();
    const data = { hotdot: 'hotdog', banana: 'banana' };
    const format = {
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
          expect(result.errors && result.errors[0]).toBe(
            'Data path ".banana" should match format "is-hotdog".');
        }),
      )
      .subscribe(done, done.fail);
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
    registry.addSmartDefaultProvider('test3', (schema) => {
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
      .subscribe(done, done.fail);
  });
});
