/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonValue } from '@angular-devkit/core';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Argv } from 'yargs';
import {
  CommandModule,
  CommandModuleError,
  CommandModuleImplementation,
  Options,
} from '../../command-builder/command-module';
import { getWorkspaceRaw, validateWorkspace } from '../../utilities/config';
import { JSONFile, parseJson } from '../../utilities/json-file';

interface ConfigCommandArgs {
  'json-path'?: string;
  value?: string;
  global?: boolean;
}

export class ConfigCommandModule
  extends CommandModule<ConfigCommandArgs>
  implements CommandModuleImplementation<ConfigCommandArgs>
{
  command = 'config [json-path] [value]';
  describe =
    'Retrieves or sets Angular configuration values in the angular.json file for the workspace.';
  longDescriptionPath = join(__dirname, 'long-description.md');

  builder(localYargs: Argv): Argv<ConfigCommandArgs> {
    return localYargs
      .positional('json-path', {
        description:
          `The configuration key to set or query, in JSON path format. ` +
          `For example: "a[3].foo.bar[2]". If no new value is provided, returns the current value of this key.`,
        type: 'string',
      })
      .positional('value', {
        description: 'If provided, a new value for the given configuration key.',
        type: 'string',
      })
      .option('global', {
        description: `Access the global configuration in the caller's home directory.`,
        alias: ['g'],
        type: 'boolean',
        default: false,
      })
      .strict();
  }

  async run(options: Options<ConfigCommandArgs>): Promise<number | void> {
    const level = options.global ? 'global' : 'local';
    const [config] = await getWorkspaceRaw(level);

    if (options.value == undefined) {
      if (!config) {
        this.context.logger.error('No config found.');

        return 1;
      }

      return this.get(config, options);
    } else {
      return this.set(options);
    }
  }

  private get(jsonFile: JSONFile, options: Options<ConfigCommandArgs>): number {
    const { logger } = this.context;

    const value = options.jsonPath
      ? jsonFile.get(parseJsonPath(options.jsonPath))
      : jsonFile.content;

    if (value === undefined) {
      logger.error('Value cannot be found.');

      return 1;
    } else if (typeof value === 'string') {
      logger.info(value);
    } else {
      logger.info(JSON.stringify(value, null, 2));
    }

    return 0;
  }

  private async set(options: Options<ConfigCommandArgs>): Promise<number | void> {
    if (!options.jsonPath?.trim()) {
      throw new CommandModuleError('Invalid Path.');
    }

    const [config, configPath] = await getWorkspaceRaw(options.global ? 'global' : 'local');
    const { logger } = this.context;

    if (!config || !configPath) {
      throw new CommandModuleError('Confguration file cannot be found.');
    }

    const normalizeUUIDValue = (v: string | undefined) => (v === '' ? randomUUID() : `${v}`);

    const value =
      options.jsonPath === 'cli.analyticsSharing.uuid'
        ? normalizeUUIDValue(options.value)
        : options.value;

    const modified = config.modify(parseJsonPath(options.jsonPath), normalizeValue(value));

    if (!modified) {
      logger.error('Value cannot be found.');

      return 1;
    }

    await validateWorkspace(parseJson(config.content), options.global ?? false);

    config.save();

    return 0;
  }
}

/**
 * Splits a JSON path string into fragments. Fragments can be used to get the value referenced
 * by the path. For example, a path of "a[3].foo.bar[2]" would give you a fragment array of
 * ["a", 3, "foo", "bar", 2].
 * @param path The JSON string to parse.
 * @returns {(string|number)[]} The fragments for the string.
 * @private
 */
function parseJsonPath(path: string): (string | number)[] {
  const fragments = (path || '').split(/\./g);
  const result: (string | number)[] = [];

  while (fragments.length > 0) {
    const fragment = fragments.shift();
    if (fragment == undefined) {
      break;
    }

    const match = fragment.match(/([^[]+)((\[.*\])*)/);
    if (!match) {
      throw new CommandModuleError('Invalid JSON path.');
    }

    result.push(match[1]);
    if (match[2]) {
      const indices = match[2]
        .slice(1, -1)
        .split('][')
        .map((x) => (/^\d$/.test(x) ? +x : x.replace(/"|'/g, '')));
      result.push(...indices);
    }
  }

  return result.filter((fragment) => fragment != null);
}

function normalizeValue(value: string | undefined | boolean | number): JsonValue | undefined {
  const valueString = `${value}`.trim();
  switch (valueString) {
    case 'true':
      return true;
    case 'false':
      return false;
    case 'null':
      return null;
    case 'undefined':
      return undefined;
  }

  if (isFinite(+valueString)) {
    return +valueString;
  }

  try {
    // We use `JSON.parse` instead of `parseJson` because the latter will parse UUIDs
    // and convert them into a numberic entities.
    // Example: 73b61974-182c-48e4-b4c6-30ddf08c5c98 -> 73.
    // These values should never contain comments, therefore using `JSON.parse` is safe.
    return JSON.parse(valueString);
  } catch {
    return value;
  }
}
