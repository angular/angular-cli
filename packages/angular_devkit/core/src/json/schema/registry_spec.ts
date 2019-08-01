/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any non-null-operator no-big-function
import { of as observableOf } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
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


  // Synchronous failure is only used internally.
  // If it's meant to be used externally then this test should change to truly be synchronous
  // (i.e. not relyign on the observable).
  it('works synchronously', done => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
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
      .toPromise().then(done, done.fail);
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
      .toPromise().then(done, done.fail);
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
          expect(result.errors && result.errors[0]).toBeTruthy();
          expect(result.errors && result.errors[0].keyword).toBe('format');
          expect(result.errors && result.errors[0].dataPath).toBe('.banana');
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

  it('adds undefined properties', done => {
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
          objAllOk: {
            allOf: [
              { type: 'object' },
            ],
          },
          objAllBad: {
            allOf: [
              { type: 'object' },
              { type: 'number' },
            ],
          },
          objOne: {
            oneOf: [
              { type: 'object' },
            ],
          },
          objNotOk: {
            not: { not: { type: 'object' } },
          },
          objNotBad: {
            type: 'object',
            not: { type: 'object' },
          },
        },
      })
      .pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          expect(result.success).toBe(true);
          expect(data.bool).toBeUndefined();
          expect(data.str).toBe('someString');
          expect(data.obj.num).toBeUndefined();
          expect(data.obj.other).toBe(0);
          expect(data.objAllOk).toEqual({});
          expect(data.objOne).toEqual({});
          expect(data.objAllBad).toBeUndefined();
          expect(data.objNotOk).toEqual({});
          expect(data.objNotBad).toBeUndefined();
        }),
      )
      .toPromise().then(done, done.fail);
  });

  it('adds defaults to undefined properties', done => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    // tslint:disable-line:no-any
    const data: any = {
      bool: undefined,
      str: undefined,
      obj: {
        num: undefined,
      },
    };

    registry
      .compile({
        properties: {
          bool: { type: 'boolean', default: true },
          str: { type: 'string', default: 'someString' },
          obj: {
            properties: {
              num: { type: 'number', default: 0 },
            },
          },
        },
      })
      .pipe(
        mergeMap(validator => validator(data)),
        map(result => {
          expect(result.success).toBe(true);
          expect(data.bool).toBe(true);
          expect(data.str).toBe('someString');
          expect(data.obj.num).toBe(0);
        }),
      )
      .toPromise().then(done, done.fail);
  });

});
