/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { json } from '@angular-devkit/core';
import yargs from 'yargs';

/**
 * An option description.
 */
export interface Option extends yargs.Options {
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
            ['boolean', 'number', 'string'].includes(current.items.type)
          ) {
            return true;
          }

          return false;

        default:
          return false;
      }
    }) as ('string' | 'number' | 'boolean' | 'array')[];

    if (types.length == 0) {
      // This means it's not usable on the command line. e.g. an Object.
      return;
    }

    // Only keep enum values we support (booleans, numbers and strings).
    const enumValues = ((json.isJsonArray(current.enum) && current.enum) || []).filter((x) => {
      switch (typeof x) {
        case 'boolean':
        case 'number':
        case 'string':
          return true;

        default:
          return false;
      }
    }) as (string | true | number)[];

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

    const type = types[0];
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
      type,
      default: defaultValue,
      choices: enumValues.length ? enumValues : undefined,
      required,
      alias,
      format,
      hidden,
      userAnalytics,
      deprecated,
      positional,
    };

    options.push(option);
  }

  const flattenedSchema = await registry.flatten(schema).toPromise();
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
