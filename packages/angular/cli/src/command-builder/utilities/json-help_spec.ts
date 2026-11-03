/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import yargs from 'yargs';
import { jsonHelpUsage, schemaOptionsToJsonHelpOptions, setJsonHelpBuilders } from './json-help';
import { Option } from './json-schema';

describe('json-help utilities', () => {
  describe('schemaOptionsToJsonHelpOptions', () => {
    it('normalizes and sorts schema options and filters out hidden options', () => {
      const options: Option[] = [
        {
          name: 'watch',
          type: 'boolean',
          default: false,
          description: 'Run build when files change.',
          alias: [],
        },
        {
          name: 'noProgress',
          type: 'boolean',
          description: 'Disable progress.',
          alias: ['p'],
        },
        {
          name: 'hiddenOption',
          type: 'string',
          hidden: true,
          description: 'Should be filtered out.',
          alias: [],
        },
        {
          name: 'compilationMode',
          type: 'string',
          choices: ['full', 'partial'],
          description: 'Compilation mode.',
          alias: [],
        },
        {
          name: 'noPrefixString',
          type: 'string',
          alias: 'n',
          deprecated: 'Use another option.',
          description: 'Non-boolean option starting with no-.',
        },
      ];

      expect(schemaOptionsToJsonHelpOptions(options)).toEqual([
        {
          name: 'compilation-mode',
          type: 'string',
          deprecated: undefined,
          aliases: undefined,
          default: undefined,
          enum: ['full', 'partial'],
          description: 'Compilation mode.',
          positional: undefined,
        },
        {
          name: 'no-prefix-string',
          type: 'string',
          deprecated: 'Use another option.',
          aliases: ['n'],
          default: undefined,
          enum: undefined,
          description: 'Non-boolean option starting with no-.',
          positional: undefined,
        },
        {
          name: 'progress',
          type: 'boolean',
          deprecated: undefined,
          aliases: ['p'],
          default: undefined,
          enum: undefined,
          description: 'Disable progress.',
          positional: undefined,
        },
        {
          name: 'watch',
          type: 'boolean',
          deprecated: undefined,
          aliases: undefined,
          default: false,
          enum: undefined,
          description: 'Run build when files change.',
          positional: undefined,
        },
      ]);
    });
  });

  describe('setJsonHelpBuilders and jsonHelpUsage', () => {
    it('includes builders in the jsonHelpUsage output when configured', () => {
      const localYargs = yargs(['build', '--help'])
        .scriptName('ng')
        .usage('$0 build [project]', 'Build command')
        .option('configuration', {
          type: 'string',
          alias: 'c',
          describe: 'Builder configuration',
        });

      setJsonHelpBuilders(localYargs, [
        {
          name: 'Application',
          options: [
            {
              name: 'aot',
              type: 'boolean',
              default: true,
              description: 'Build using Ahead of Time compilation.',
            },
          ],
        },
        {
          name: 'Library',
          options: [
            {
              name: 'compilation-mode',
              type: 'string',
              enum: ['full', 'partial'],
              description: 'Angular compilation mode.',
            },
          ],
        },
      ]);

      const parsed = JSON.parse(jsonHelpUsage(localYargs));
      expect(parsed.builders).toEqual([
        {
          name: 'Application',
          options: [
            {
              name: 'aot',
              type: 'boolean',
              default: true,
              description: 'Build using Ahead of Time compilation.',
            },
          ],
        },
        {
          name: 'Library',
          options: [
            {
              name: 'compilation-mode',
              type: 'string',
              enum: ['full', 'partial'],
              description: 'Angular compilation mode.',
            },
          ],
        },
      ]);
    });

    it('omits builders when setJsonHelpBuilders is not called', () => {
      const localYargs = yargs(['version', '--help'])
        .scriptName('ng')
        .usage('$0 version', 'Version command');

      const parsed = JSON.parse(jsonHelpUsage(localYargs));
      expect(parsed.builders).toBeUndefined();
    });
  });
});
