/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { json, strings } from '@angular-devkit/core';
import type { Arguments, Argv, PositionalOptions, Options as YargsOptions } from 'yargs';

/**
 * An option description.
 */
export interface Option extends YargsOptions {
  /**
   * The name of the option.
   */
  name: string;

  /**
   * Whether this option is required or not.
   */
  required?: boolean;

  /**
   * Format field of this option.
   */
  format?: string;

  /**
   * Whether this option should be hidden from the help output. It will still show up in JSON help.
   */
  hidden?: boolean;

  /**
   * If this option can be used as an argument, the position of the argument. Otherwise omitted.
   */
  positional?: number;

  /**
   * Whether or not to report this option to the Angular Team, and which custom field to use.
   * If this is falsey, do not report this option.
   */
  userAnalytics?: string;

  /**
   * Type of the values in a key/value pair field.
   */
  itemValueType?: 'string';
}

function coerceToStringMap(
  dashedName: string,
  value: (string | undefined)[],
): Record<string, string> | Promise<never> {
  const stringMap: Record<string, string> = {};
  for (const pair of value) {
    // This happens when the flag isn't passed at all.
    if (pair === undefined) {
      continue;
    }

    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) {
      // TODO: Remove workaround once yargs properly handles thrown errors from coerce.
      // Right now these sometimes end up as uncaught exceptions instead of proper validation
      // errors with usage output.
      return Promise.reject(
        new Error(
          `Invalid value for argument: ${dashedName}, Given: '${pair}', Expected key=value pair`,
        ),
      );
    }
    const key = pair.slice(0, eqIdx);
    const value = pair.slice(eqIdx + 1);
    stringMap[key] = value;
  }

  return stringMap;
}

function isStringMap(node: json.JsonObject): boolean {
  // Exclude fields with more specific kinds of properties.
  if (node.properties || node.patternProperties) {
    return false;
  }

  // Restrict to additionalProperties with string values.
  return (
    json.isJsonObject(node.additionalProperties) &&
    !node.additionalProperties.enum &&
    node.additionalProperties.type === 'string'
  );
}

export async function parseJsonSchemaToOptions(
  registry: json.schema.SchemaRegistry,
  schema: json.JsonObject,
  interactive = true,
): Promise<Option[]> {
  const options: Option[] = [];

  function visitor(
    current: json.JsonObject | json.JsonArray,
    pointer: json.schema.JsonPointer,
    parentSchema?: json.JsonObject | json.JsonArray,
  ) {
    if (!parentSchema) {
      // Ignore root.
      return;
    } else if (pointer.split(/\/(?:properties|items|definitions)\//g).length > 2) {
      // Ignore subitems (objects or arrays).
      return;
    } else if (json.isJsonArray(current)) {
      return;
    }

    if (pointer.indexOf('/not/') != -1) {
      // We don't support anyOf/not.
      throw new Error('The "not" keyword is not supported in JSON Schema.');
    }

    const ptr = json.schema.parseJsonPointer(pointer);
    const name = ptr[ptr.length - 1];

    if (ptr[ptr.length - 2] != 'properties') {
      // Skip any non-property items.
      return;
    }

    const typeSet = json.schema.getTypesOfSchema(current);

    if (typeSet.size == 0) {
      throw new Error('Cannot find type of schema.');
    }

    // We only support number, string or boolean (or array of those), so remove everything else.
    const types = [...typeSet].filter((x) => {
      switch (x) {
        case 'boolean':
        case 'number':
        case 'string':
          return true;

        case 'array':
          // Only include arrays if they're boolean, string or number.
          if (
            json.isJsonObject(current.items) &&
            typeof current.items.type == 'string' &&
            isValidTypeForEnum(current.items.type)
          ) {
            return true;
          }

          return false;

        case 'object':
          return isStringMap(current);

        default:
          return false;
      }
    }) as ('string' | 'number' | 'boolean' | 'array' | 'object')[];

    if (types.length == 0) {
      // This means it's not usable on the command line. e.g. an Object.
      return;
    }

    // Only keep enum values we support (booleans, numbers and strings).
    const enumValues = (
      (json.isJsonArray(current.enum) && current.enum) ||
      (json.isJsonObject(current.items) &&
        json.isJsonArray(current.items.enum) &&
        current.items.enum) ||
      []
    )
      .filter((value) => isValidTypeForEnum(typeof value))
      .sort() as (string | true | number)[];

    let defaultValue: string | number | boolean | undefined = undefined;
    if (current.default !== undefined) {
      switch (types[0]) {
        case 'string':
          if (typeof current.default == 'string') {
            defaultValue = current.default;
          }
          break;
        case 'number':
          if (typeof current.default == 'number') {
            defaultValue = current.default;
          }
          break;
        case 'boolean':
          if (typeof current.default == 'boolean') {
            defaultValue = current.default;
          }
          break;
      }
    }

    const $default = current.$default;
    const $defaultIndex =
      json.isJsonObject($default) && $default['$source'] == 'argv' ? $default['index'] : undefined;
    const positional: number | undefined =
      typeof $defaultIndex == 'number' ? $defaultIndex : undefined;

    let required = json.isJsonArray(schema.required) ? schema.required.includes(name) : false;
    if (required && interactive && current['x-prompt']) {
      required = false;
    }

    const alias = json.isJsonArray(current.aliases)
      ? [...current.aliases].map((x) => '' + x)
      : current.alias
        ? ['' + current.alias]
        : [];
    const format = typeof current.format == 'string' ? current.format : undefined;
    const visible = current.visible === undefined || current.visible === true;
    const hidden = !!current.hidden || !visible;

    const xUserAnalytics = current['x-user-analytics'];
    const userAnalytics = typeof xUserAnalytics === 'string' ? xUserAnalytics : undefined;

    // Deprecated is set only if it's true or a string.
    const xDeprecated = current['x-deprecated'];
    const deprecated =
      xDeprecated === true || typeof xDeprecated === 'string' ? xDeprecated : undefined;

    const option: Option = {
      name,
      description: '' + (current.description === undefined ? '' : current.description),
      default: defaultValue,
      choices: enumValues.length ? enumValues : undefined,
      required,
      alias,
      format,
      hidden,
      userAnalytics,
      deprecated,
      positional,
      ...(types[0] === 'object'
        ? {
            type: 'array',
            itemValueType: 'string',
          }
        : {
            type: types[0],
          }),
    };

    options.push(option);
  }

  const flattenedSchema = await registry.ɵflatten(schema);
  json.schema.visitJsonSchema(flattenedSchema, visitor);

  // Sort by positional and name.
  return options.sort((a, b) => {
    if (a.positional) {
      return b.positional ? a.positional - b.positional : a.name.localeCompare(b.name);
    } else if (b.positional) {
      return -1;
    }

    return a.name.localeCompare(b.name);
  });
}

/**
 * Adds schema options to a command also this keeps track of options that are required for analytics.
 * **Note:** This method should be called from the command bundler method.
 *
 * @returns A map from option name to analytics configuration.
 */
export function addSchemaOptionsToCommand<T>(
  localYargs: Argv<T>,
  options: Option[],
  includeDefaultValues: boolean,
): Map<string, string> {
  const booleanOptionsWithNoPrefix = new Set<string>();
  const keyValuePairOptions = new Set<string>();
  const optionsWithAnalytics = new Map<string, string>();

  for (const option of options) {
    const {
      default: defaultVal,
      positional,
      deprecated,
      description,
      alias,
      userAnalytics,
      type,
      itemValueType,
      hidden,
      name,
      choices,
    } = option;

    let dashedName = strings.dasherize(name);

    // Handle options which have been defined in the schema with `no` prefix.
    if (type === 'boolean' && dashedName.startsWith('no-')) {
      dashedName = dashedName.slice(3);
      booleanOptionsWithNoPrefix.add(dashedName);
    }

    if (itemValueType) {
      keyValuePairOptions.add(name);
    }

    const sharedOptions: YargsOptions & PositionalOptions = {
      alias,
      hidden,
      description,
      deprecated,
      choices,
      coerce: itemValueType ? coerceToStringMap.bind(null, dashedName) : undefined,
      // This should only be done when `--help` is used otherwise default will override options set in angular.json.
      ...(includeDefaultValues ? { default: defaultVal } : {}),
    };

    if (positional === undefined) {
      localYargs = localYargs.option(dashedName, {
        array: itemValueType ? true : undefined,
        type: itemValueType ?? type,
        ...sharedOptions,
      });
    } else {
      localYargs = localYargs.positional(dashedName, {
        type: type === 'array' || type === 'count' ? 'string' : type,
        ...sharedOptions,
      });
    }

    // Record option of analytics.
    if (userAnalytics !== undefined) {
      optionsWithAnalytics.set(name, userAnalytics);
    }
  }

  // Handle options which have been defined in the schema with `no` prefix.
  if (booleanOptionsWithNoPrefix.size) {
    localYargs.middleware((options: Arguments) => {
      for (const key of booleanOptionsWithNoPrefix) {
        if (key in options) {
          options[`no-${key}`] = !options[key];
          delete options[key];
        }
      }
    }, false);
  }

  return optionsWithAnalytics;
}

const VALID_ENUM_TYPES = new Set(['boolean', 'number', 'string']);
function isValidTypeForEnum(value: string): boolean {
  return VALID_ENUM_TYPES.has(value);
}
