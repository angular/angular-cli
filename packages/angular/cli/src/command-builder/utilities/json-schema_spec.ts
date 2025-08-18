/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { schema } from '@angular-devkit/core';
import yargs from 'yargs';

import { addSchemaOptionsToCommand, parseJsonSchemaToOptions } from './json-schema';

describe('parseJsonSchemaToOptions', () => {
  describe('without required fields in schema', () => {
    const parse = async (args: string[]) => {
      // Yargs only exposes the parse errors as proper errors when using the
      // callback syntax. This unwraps that ugly workaround so tests can just
      // use simple .toThrow/.toEqual assertions.
      return localYargs.parseAsync(args);
    };

    let localYargs: yargs.Argv<unknown>;
    beforeEach(async () => {
      // Create a fresh yargs for each call. The yargs object is stateful and
      // calling .parse multiple times on the same instance isn't safe.
      localYargs = yargs().exitProcess(false).strict().fail(false).wrap(1_000);
      const jsonSchema = {
        'type': 'object',
        'properties': {
          'maxSize': {
            'type': 'number',
          },
          'ssr': {
            'type': 'string',
            'enum': ['always', 'surprise-me', 'never'],
          },
          'arrayWithChoices': {
            'type': 'array',
            'default': 'default-array',
            'items': {
              'type': 'string',
              'enum': ['always', 'never', 'default-array'],
            },
          },
          'extendable': {
            'type': 'object',
            'properties': {},
            'additionalProperties': {
              'type': 'string',
            },
          },
          'someDefine': {
            'type': 'object',
            'additionalProperties': {
              'type': 'string',
            },
          },
        },
      };
      const registry = new schema.CoreSchemaRegistry();
      const options = await parseJsonSchemaToOptions(registry, jsonSchema, false);
      addSchemaOptionsToCommand(localYargs, options, true);
    });

    describe('type=number', () => {
      it('parses valid option value', async () => {
        expect(await parse(['--max-size', '42'])).toEqual(
          jasmine.objectContaining({
            'maxSize': 42,
          }),
        );
      });
    });

    describe('type=array, enum', () => {
      it('parses valid option value', async () => {
        expect(
          await parse(['--arrayWithChoices', 'always', '--arrayWithChoices', 'never']),
        ).toEqual(
          jasmine.objectContaining({
            'arrayWithChoices': ['always', 'never'],
          }),
        );
      });

      it('rejects non-enum values', async () => {
        await expectAsync(parse(['--arrayWithChoices', 'yes'])).toBeRejectedWithError(
          /Argument: array-with-choices, Given: "yes", Choices:/,
        );
      });

      it('should add default value to help', async () => {
        expect(await localYargs.getHelp()).toContain('[default: "default-array"]');
      });
    });

    describe('type=string, enum', () => {
      it('parses valid option value', async () => {
        expect(await parse(['--ssr', 'never'])).toEqual(
          jasmine.objectContaining({
            'ssr': 'never',
          }),
        );
      });

      it('rejects non-enum values', async () => {
        await expectAsync(parse(['--ssr', 'yes'])).toBeRejectedWithError(
          /Argument: ssr, Given: "yes", Choices:/,
        );
      });
    });

    describe('type=object', () => {
      it('ignores fields that define specific properties', async () => {
        await expectAsync(parse(['--extendable', 'a=b'])).toBeRejectedWithError(
          /Unknown argument: extendable/,
        );
      });

      it('rejects invalid values for string maps', async () => {
        await expectAsync(parse(['--some-define', 'foo'])).toBeRejectedWithError(
          /Invalid value for argument: some-define, Given: 'foo', Expected key=value pair/,
        );
        await expectAsync(parse(['--some-define', '42'])).toBeRejectedWithError(
          /Invalid value for argument: some-define, Given: '42', Expected key=value pair/,
        );
      });

      it('aggregates an object value', async () => {
        expect(
          await parse([
            '--some-define',
            'A_BOOLEAN=true',
            '--some-define',
            'AN_INTEGER=42',
            // Ensure we can handle '=' inside of string values.
            '--some-define=A_STRING="❤️=❤️"',
            '--some-define',
            'AN_UNQUOTED_STRING=❤️=❤️',
          ]),
        ).toEqual(
          jasmine.objectContaining({
            'someDefine': {
              'A_BOOLEAN': 'true',
              'AN_INTEGER': '42',
              'A_STRING': '"❤️=❤️"',
              'AN_UNQUOTED_STRING': '❤️=❤️',
            },
          }),
        );
      });
    });
  });

  describe('with required positional argument', () => {
    it('marks the required argument as required', async () => {
      const jsonSchema = {
        '$id': 'FakeSchema',
        'title': 'Fake Schema',
        'type': 'object',
        'required': ['a'],
        'properties': {
          'b': {
            'type': 'string',
            'description': 'b.',
            '$default': {
              '$source': 'argv',
              'index': 1,
            },
          },
          'a': {
            'type': 'string',
            'description': 'a.',
            '$default': {
              '$source': 'argv',
              'index': 0,
            },
          },
          'optC': {
            'type': 'string',
            'description': 'optC',
          },
          'optA': {
            'type': 'string',
            'description': 'optA',
          },
          'optB': {
            'type': 'string',
            'description': 'optB',
          },
        },
      };
      const registry = new schema.CoreSchemaRegistry();
      const options = await parseJsonSchemaToOptions(registry, jsonSchema, /* interactive= */ true);

      expect(options.find((opt) => opt.name === 'a')).toEqual(
        jasmine.objectContaining({
          name: 'a',
          positional: 0,
          required: true,
        }),
      );
      expect(options.find((opt) => opt.name === 'b')).toEqual(
        jasmine.objectContaining({
          name: 'b',
          positional: 1,
          required: false,
        }),
      );
    });
  });
});
