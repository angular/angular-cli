/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { SchemaFormat } from './interface';
import { CoreSchemaRegistry, SchemaValidationException } from './registry';
import { addUndefinedDefaults } from './transforms';

describe('CoreSchemaRegistry', () => {
  it('works asynchronously', async () => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data: any = {};

    const validator = await registry.compile({
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
          $ref: 'https://raw.githubusercontent.com/SchemaStore/schemastore/734c0e5/src/schemas/json/tslint.json#',
        },
      },
    });

    const result = await validator(data);
    expect(result.success).toBe(true);
    expect(data.obj.num).toBeUndefined();
    expect(data.tslint).not.toBeUndefined();
  });

  it('supports pre transforms', async () => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data = {};

    registry.addPreTransform((data, ptr) => {
      if (ptr == '/') {
        return { str: 'string' };
      }

      return data;
    });

    const validator = await registry.compile({
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
    });

    const result = await validator(data);
    const resultData = result.data as any;
    expect(result.success).toBe(true);
    expect(resultData.str).toBe('string');
    expect(resultData.obj.num).toBeUndefined();
  });

  it('supports local references', async () => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data = { numbers: { one: 1 } };

    const validator = await registry.compile({
      properties: {
        numbers: {
          type: 'object',
          additionalProperties: { '$ref': '#/definitions/myRef' },
        },
      },
      definitions: {
        myRef: { type: 'integer' },
      },
    });
    const result = await validator(data);
    expect(result.success).toBe(true);
    expect(data.numbers.one).not.toBeUndefined();
  });

  it('fails on invalid additionalProperties', async () => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data = { notNum: 'foo' };
    const validator = await registry.compile({
      properties: {
        num: { type: 'number' },
      },
      additionalProperties: false,
    });

    const result = await validator(data);
    expect(result.success).toBe(false);
    expect(result.errors && result.errors[0].message).toContain(
      'must NOT have additional properties',
    );
  });

  it('fails on invalid enum value', async () => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data = { packageManager: 'foo' };

    const validator = await registry.compile({
      properties: {
        packageManager: { type: 'string', enum: ['npm', 'yarn', 'pnpm'] },
      },
      additionalProperties: false,
    });

    const result = await validator(data);
    expect(result.success).toBe(false);
    expect(new SchemaValidationException(result.errors).message).toContain(
      `Data path "/packageManager" must be equal to one of the allowed values. Allowed values are: "npm", "yarn", "pnpm".`,
    );
  });

  it('fails on invalid additionalProperties async', async () => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data = { notNum: 'foo' };
    const validator = await registry.compile({
      $async: true,
      properties: {
        num: { type: 'number' },
      },
      additionalProperties: false,
    });
    const result = await validator(data);
    expect(result.success).toBe(false);
    expect(result.errors?.[0].message).toContain('must NOT have additional properties');
    expect(result.errors?.[0].keyword).toBe('additionalProperties');
  });

  it('supports sync format', async () => {
    const registry = new CoreSchemaRegistry();
    const data = { str: 'hotdog' };
    const format = {
      name: 'is-hotdog',
      formatter: {
        validate: (str: string) => str === 'hotdog',
      },
    };

    registry.addFormat(format);
    const validator = await registry.compile({
      properties: {
        str: { type: 'string', format: 'is-hotdog' },
      },
    });
    const result = await validator(data);
    expect(result.success).toBe(true);
  });

  it('supports async format', async () => {
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

    const validator = await registry.compile({
      $async: true,
      properties: {
        str: { type: 'string', format: 'is-hotdog' },
      },
    });
    const result = await validator(data);
    expect(result.success).toBe(true);
  });

  it('shows dataPath and message on error', async () => {
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

    const validator = await registry.compile({
      properties: {
        hotdot: { type: 'string', format: 'is-hotdog' },
        banana: { type: 'string', format: 'is-hotdog' },
      },
    });

    const result = await validator(data);
    expect(result.success).toBe(false);
    expect(result.errors && result.errors[0]).toBeTruthy();
    expect(result.errors && result.errors[0].keyword).toBe('format');
    expect(result.errors && result.errors[0].instancePath).toBe('/banana');
    expect(result.errors && (result.errors[0].params as any).format).toBe('is-hotdog');
  });

  it('supports smart defaults', async () => {
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
      return [1, 2, 3];
    });

    const validator = await registry.compile({
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
    });
    const result = await validator(data);
    expect(result.success).toBe(true);
    expect(data.bool).toBe(true);
    expect(data.arr[0].test).toBe('yep');
    expect(data.arr2).toEqual([1, 2, 3]);
    expect(data.obj.deep.arr).toEqual([1, 2, 3]);
  });

  it('works with true as a schema and post-transforms', async () => {
    const registry = new CoreSchemaRegistry();
    registry.addPostTransform(addUndefinedDefaults);
    const data = { a: 1, b: 2 };

    const validate = await registry.compile(true);
    const result = await validate(data);

    expect(result.success).toBe(true);
    expect(result.data).toBe(data);
  });

  it('adds deprecated options usage', async () => {
    const registry = new CoreSchemaRegistry();
    const deprecatedMessages: string[] = [];
    registry.useXDeprecatedProvider((m) => deprecatedMessages.push(m));

    const data = {
      foo: true,
      bar: true,
      bat: true,
    };

    const validator = await registry.compile({
      properties: {
        foo: { type: 'boolean', 'x-deprecated': 'Use bar instead.' },
        bar: { type: 'boolean', 'x-deprecated': true },
        buz: { type: 'boolean', 'x-deprecated': true },
        bat: { type: 'boolean', 'x-deprecated': false },
      },
    });
    const result = await validator(data);
    expect(deprecatedMessages.length).toBe(2);
    expect(deprecatedMessages[0]).toBe('Option "foo" is deprecated: Use bar instead.');
    expect(deprecatedMessages[1]).toBe('Option "bar" is deprecated.');
    expect(result.success).toBe(true, result.errors);
  });
});
