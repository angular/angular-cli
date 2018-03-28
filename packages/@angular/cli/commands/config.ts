import { writeFileSync } from 'fs';
import { Command, Option } from '../models/command';
import { getWorkspace, getWorkspaceRaw, validateWorkspace } from '../utilities/config';

const SilentError = require('silent-error');

// devkit/local bridge types and imports.
import {
  JsonValue as JsonValueT,
  JsonArray as JsonArrayT,
  JsonObject as JsonObjectT,
} from '@angular-devkit/core';
import { experimental as experimentalT } from '@angular-devkit/core';
import { core } from '../utilities/devkit-local-bridge';
const { JsonParseMode, parseJson } = core;


export interface ConfigOptions {
  jsonPath: string;
  value?: string;
  global?: boolean;
}

/**
 * Splits a JSON path string into fragments. Fragments can be used to get the value referenced
 * by the path. For example, a path of "a[3].foo.bar[2]" would give you a fragment array of
 * ["a", 3, "foo", "bar", 2].
 * @param path The JSON string to parse.
 * @returns {string[]} The fragments for the string.
 * @private
 */
function parseJsonPath(path: string): string[] {
  const fragments = (path || '').split(/\./g);
  const result: string[] = [];

  while (fragments.length > 0) {
    const fragment = fragments.shift();

    const match = fragment.match(/([^\[]+)((\[.*\])*)/);
    if (!match) {
      throw new Error('Invalid JSON path.');
    }

    result.push(match[1]);
    if (match[2]) {
      const indices = match[2].slice(1, -1).split('][');
      result.push(...indices);
    }
  }

  return result.filter(fragment => !!fragment);
}

function getValueFromPath<T extends JsonArrayT | JsonObjectT>(
  root: T,
  path: string,
): JsonValueT | undefined {
  const fragments = parseJsonPath(path);

  try {
    return fragments.reduce((value: JsonValueT, current: string | number) => {
      if (value == undefined || typeof value != 'object') {
        return undefined;
      } else if (typeof current == 'string' && !Array.isArray(value)) {
        return value[current];
      } else if (typeof current == 'number' && Array.isArray(value)) {
        return value[current];
      } else {
        return undefined;
      }
    }, root);
  } catch {
    return undefined;
  }
}

function setValueFromPath<T extends JsonArrayT | JsonObjectT>(
  root: T,
  path: string,
  newValue: JsonValueT,
): JsonValueT | undefined {
  const fragments = parseJsonPath(path);

  try {
    return fragments.reduce((value: JsonValueT, current: string | number, index: number) => {
      if (value == undefined || typeof value != 'object') {
        return undefined;
      } else if (typeof current == 'string' && !Array.isArray(value)) {
        if (index === fragments.length - 1) {
          value[current] = newValue;
        } else if (value[current] == undefined) {
          if (typeof fragments[index + 1] == 'number') {
            value[current] = [];
          } else if (typeof fragments[index + 1] == 'string') {
            value[current] = {};
          }
        }
        return value[current];
      } else if (typeof current == 'number' && Array.isArray(value)) {
        if (index === fragments.length - 1) {
          value[current] = newValue;
        } else if (value[current] == undefined) {
          if (typeof fragments[index + 1] == 'number') {
            value[current] = [];
          } else if (typeof fragments[index + 1] == 'string') {
            value[current] = {};
          }
        }
        return value[current];
      } else {
        return undefined;
      }
    }, root);
  } catch {
    return undefined;
  }
}

export default class ConfigCommand extends Command {
  public readonly name = 'config';
  public readonly description = 'Get/set configuration values.';
  public readonly arguments = ['jsonPath', 'value'];
  public readonly options: Option[] = [
    // {
    //   name: 'global',
    //   type: Boolean,
    //   'default': false,
    //   aliases: ['g'],
    //   description: 'Get/set the value in the global configuration (in your home directory).'
    // }
  ];

  public run(options: ConfigOptions) {
    const config = (getWorkspace() as {} as { _workspace: experimentalT.workspace.WorkspaceJson});

    if (!config) {
      throw new SilentError('No config found.');
    }

    if (options.value == undefined) {
      this.get(config._workspace, options);
    } else {
      this.set(options);
    }
  }

  private get(config: experimentalT.workspace.WorkspaceJson, options: ConfigOptions) {
    const value = options.jsonPath ? getValueFromPath(config as any, options.jsonPath) : config;

    if (value === undefined) {
      throw new SilentError('Value cannot be found.');
    } else if (typeof value == 'object') {
      this.logger.info(JSON.stringify(value, null, 2));
    } else {
      this.logger.info(value.toString());
    }
  }

  private set(options: ConfigOptions) {
    const [config, configPath] = getWorkspaceRaw();

    // TODO: Modify & save without destroying comments
    const configValue = config.value;

    const value = parseJson(options.value, JsonParseMode.Loose);
    const result = setValueFromPath(configValue, options.jsonPath, value);

    if (result === undefined) {
      throw new SilentError('Value cannot be found.');
    }

    try {
      validateWorkspace(configValue);
    } catch (error) {
      this.logger.error(error.message);
      throw new SilentError();
    }

    const output = JSON.stringify(configValue);
    writeFileSync(configPath, output);
  }

}
