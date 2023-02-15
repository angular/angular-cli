/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CoreSchemaRegistry } from './registry';

describe('Prompt Provider', () => {
  it('sets properties with answer', async () => {
    const registry = new CoreSchemaRegistry();
    const data: any = {};

    registry.usePromptProvider(async (definitions) => {
      return { [definitions[0].id]: true };
    });

    const validator = await registry.compile({
      properties: {
        test: {
          type: 'boolean',
          'x-prompt': 'test-message',
        },
      },
    });

    await validator(data);
    expect(data.test).toBe(true);
  });

  it('supports mixed schema references', async () => {
    const registry = new CoreSchemaRegistry();
    const data: any = {};

    registry.usePromptProvider(async (definitions) => {
      return {
        '/bool': true,
        '/test': 'two',
        '/obj/deep/three': 'test3-answer',
      };
    });

    const validator = await registry.compile({
      properties: {
        bool: {
          $ref: '#/definitions/example',
        },
        test: {
          type: 'string',
          enum: ['one', 'two', 'three'],
          'x-prompt': {
            type: 'list',
            'message': 'other-message',
          },
        },
        obj: {
          properties: {
            deep: {
              properties: {
                three: {
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
          'x-prompt': 'example-message',
        },
        test3: {
          type: 'string',
          'x-prompt': 'test3-message',
        },
      },
    });

    const result = await validator(data);
    expect(result.success).toBe(true);
    expect(data.bool).toBe(true);
    expect(data.test).toBe('two');
    expect(data.obj.deep.three).toEqual('test3-answer');
  });

  describe('with shorthand', () => {
    it('supports message value', async () => {
      const registry = new CoreSchemaRegistry();
      const data: any = {};

      registry.usePromptProvider(async (definitions) => {
        expect(definitions.length).toBe(1);
        expect(definitions[0].message).toBe('test-message');

        return {};
      });

      const validator = await registry.compile({
        properties: {
          test: {
            type: 'string',
            'x-prompt': 'test-message',
          },
        },
      });

      await validator(data);
    });

    it('analyzes enums', async () => {
      const registry = new CoreSchemaRegistry();
      const data: any = {};

      registry.usePromptProvider(async (definitions) => {
        expect(definitions.length).toBe(1);
        expect(definitions[0].type).toBe('list');
        expect(definitions[0].items).toEqual(['one', 'two', 'three']);

        return {};
      });

      const validator = await registry.compile({
        properties: {
          test: {
            type: 'string',
            enum: ['one', 'two', 'three'],
            'x-prompt': 'test-message',
          },
        },
      });
      await validator(data);
    });

    it('analyzes boolean properties', async () => {
      const registry = new CoreSchemaRegistry();
      const data: any = {};

      registry.usePromptProvider(async (definitions) => {
        expect(definitions.length).toBe(1);
        expect(definitions[0].type).toBe('confirmation');
        expect(definitions[0].items).toBeUndefined();

        return {};
      });

      const validator = await registry.compile({
        properties: {
          test: {
            type: 'boolean',
            'x-prompt': 'test-message',
          },
        },
      });
      await validator(data);
    });
  });

  describe('with longhand', () => {
    it('supports message option', async () => {
      const registry = new CoreSchemaRegistry();
      const data: any = {};

      registry.usePromptProvider(async (definitions) => {
        expect(definitions.length).toBe(1);
        expect(definitions[0].message).toBe('test-message');

        return {};
      });

      const validator = await registry.compile({
        properties: {
          test: {
            type: 'string',
            'x-prompt': {
              'message': 'test-message',
            },
          },
        },
      });
      await validator(data);
    });

    it('analyzes enums WITH explicit list type', async () => {
      const registry = new CoreSchemaRegistry();
      const data: any = {};

      registry.usePromptProvider(async (definitions) => {
        expect(definitions.length).toBe(1);
        expect(definitions[0].type).toBe('list');
        expect(definitions[0].items).toEqual(['one', 'two', 'three']);

        return { [definitions[0].id]: 'one' };
      });

      const validator = await registry.compile({
        properties: {
          test: {
            type: 'string',
            enum: ['one', 'two', 'three'],
            'x-prompt': {
              'type': 'list',
              'message': 'test-message',
            },
          },
        },
      });
      await validator(data);
    });

    it('analyzes list with true multiselect option and object items', async () => {
      const registry = new CoreSchemaRegistry();
      const data: any = {};

      registry.usePromptProvider(async (definitions) => {
        expect(definitions.length).toBe(1);
        expect(definitions[0].type).toBe('list');
        expect(definitions[0].multiselect).toBe(true);
        expect(definitions[0].items).toEqual([
          { 'value': 'one', 'label': 'one' },
          { 'value': 'two', 'label': 'two' },
        ]);

        return { [definitions[0].id]: { 'value': 'one', 'label': 'one' } };
      });

      const validator = await registry.compile({
        properties: {
          test: {
            type: 'array',
            'x-prompt': {
              'type': 'list',
              'multiselect': true,
              'items': [
                { 'value': 'one', 'label': 'one' },
                { 'value': 'two', 'label': 'two' },
              ],
              'message': 'test-message',
            },
          },
        },
      });
      await validator(data);
    });

    it('analyzes list with false multiselect option and object items', async () => {
      const registry = new CoreSchemaRegistry();
      const data: any = {};

      registry.usePromptProvider(async (definitions) => {
        expect(definitions.length).toBe(1);
        expect(definitions[0].type).toBe('list');
        expect(definitions[0].multiselect).toBe(false);
        expect(definitions[0].items).toEqual([
          { 'value': 'one', 'label': 'one' },
          { 'value': 'two', 'label': 'two' },
        ]);

        return { [definitions[0].id]: { 'value': 'one', 'label': 'one' } };
      });

      const validator = await registry.compile({
        properties: {
          test: {
            type: 'array',
            'x-prompt': {
              'type': 'list',
              'multiselect': false,
              'items': [
                { 'value': 'one', 'label': 'one' },
                { 'value': 'two', 'label': 'two' },
              ],
              'message': 'test-message',
            },
          },
        },
      });
      await validator(data);
    });

    it('analyzes list without multiselect option and object items', async () => {
      const registry = new CoreSchemaRegistry();
      const data: any = {};

      registry.usePromptProvider(async (definitions) => {
        expect(definitions.length).toBe(1);
        expect(definitions[0].type).toBe('list');
        expect(definitions[0].multiselect).toBe(true);
        expect(definitions[0].items).toEqual([
          { 'value': 'one', 'label': 'one' },
          { 'value': 'two', 'label': 'two' },
        ]);

        return { [definitions[0].id]: { 'value': 'two', 'label': 'two' } };
      });

      const validator = await registry.compile({
        properties: {
          test: {
            type: 'array',
            'x-prompt': {
              'type': 'list',
              'items': [
                { 'value': 'one', 'label': 'one' },
                { 'value': 'two', 'label': 'two' },
              ],
              'message': 'test-message',
            },
          },
        },
      });
      await validator(data);
    });

    it('analyzes enums WITHOUT explicit list type', async () => {
      const registry = new CoreSchemaRegistry();
      const data: any = {};

      registry.usePromptProvider(async (definitions) => {
        expect(definitions.length).toBe(1);
        expect(definitions[0].type).toBe('list');
        expect(definitions[0].multiselect).toBeFalsy();
        expect(definitions[0].items).toEqual(['one', 'two', 'three']);

        return {};
      });
      const validator = await registry.compile({
        properties: {
          test: {
            type: 'string',
            enum: ['one', 'two', 'three'],
            'x-prompt': {
              'message': 'test-message',
            },
          },
        },
      });
      await validator(data);
    });

    it('analyzes enums WITHOUT explicit list type and multiselect', async () => {
      const registry = new CoreSchemaRegistry();
      const data: any = {};

      registry.usePromptProvider(async (definitions) => {
        expect(definitions.length).toBe(1);
        expect(definitions[0].type).toBe('list');
        expect(definitions[0].multiselect).toBe(true);
        expect(definitions[0].items).toEqual(['one', 'two', 'three']);

        return {};
      });

      const validator = await registry.compile({
        properties: {
          test: {
            type: 'array',
            items: {
              enum: ['one', 'two', 'three'],
            },
            'x-prompt': 'test-message',
          },
        },
      });
      await validator(data);
    });

    it('analyzes boolean properties', async () => {
      const registry = new CoreSchemaRegistry();
      const data: any = {};

      registry.usePromptProvider(async (definitions) => {
        expect(definitions.length).toBe(1);
        expect(definitions[0].type).toBe('confirmation');
        expect(definitions[0].items).toBeUndefined();

        return {};
      });

      const validator = await registry.compile({
        properties: {
          test: {
            type: 'boolean',
            'x-prompt': {
              'message': 'test-message',
            },
          },
        },
      });
      await validator(data);
    });

    it('allows prompt type override', async () => {
      const registry = new CoreSchemaRegistry();
      const data: any = {};

      registry.usePromptProvider(async (definitions) => {
        expect(definitions.length).toBe(1);
        expect(definitions[0].type).toBe('input');
        expect(definitions[0].items).toBeUndefined();

        return {};
      });

      const validator = await registry.compile({
        properties: {
          test: {
            type: 'boolean',
            'x-prompt': {
              'type': 'input',
              'message': 'test-message',
            },
          },
        },
      });
      await validator(data);
    });
  });
});
