/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException, json } from '@angular-devkit/core';
import { ExportStringRef } from '@angular-devkit/schematics/tools';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import {
  CommandConstructor,
  CommandDescription,
  CommandScope,
  Option,
  OptionType,
  SubCommandDescription,
  Value,
} from '../models/interface';


export class CommandJsonPathException extends BaseException {
  constructor(public readonly path: string, public readonly name: string) {
    super(`File ${path} was not found while constructing the subcommand ${name}.`);
  }
}

function _getEnumFromValue<E, T extends E[keyof E]>(
  value: json.JsonValue,
  enumeration: E,
  defaultValue: T,
): T {
  if (typeof value !== 'string') {
    return defaultValue;
  }

  if (Object.values(enumeration).indexOf(value) !== -1) {
    // TODO: this should be unknown
    // tslint:disable-next-line:no-any
    return value as any as T;
  }

  return defaultValue;
}

export async function parseJsonSchemaToSubCommandDescription(
  name: string,
  jsonPath: string,
  registry: json.schema.SchemaRegistry,
  schema: json.JsonObject,
): Promise<SubCommandDescription> {
  const options = await parseJsonSchemaToOptions(registry, schema);

  const aliases: string[] = [];
  if (json.isJsonArray(schema.$aliases)) {
    schema.$aliases.forEach(value => {
      if (typeof value == 'string') {
        aliases.push(value);
      }
    });
  }
  if (json.isJsonArray(schema.aliases)) {
    schema.aliases.forEach(value => {
      if (typeof value == 'string') {
        aliases.push(value);
      }
    });
  }
  if (typeof schema.alias == 'string') {
    aliases.push(schema.alias);
  }

  let longDescription = '';
  if (typeof schema.$longDescription == 'string' && schema.$longDescription) {
    const ldPath = resolve(dirname(jsonPath), schema.$longDescription);
    try {
      longDescription = readFileSync(ldPath, 'utf-8');
    } catch (e) {
      throw new CommandJsonPathException(ldPath, name);
    }
  }
  let usageNotes = '';
  if (typeof schema.$usageNotes == 'string' && schema.$usageNotes) {
    const unPath = resolve(dirname(jsonPath), schema.$usageNotes);
    try {
      usageNotes = readFileSync(unPath, 'utf-8');
    } catch (e) {
      throw new CommandJsonPathException(unPath, name);
    }
  }

  const description = '' + (schema.description === undefined ? '' : schema.description);

  return {
    name,
    description,
    ...(longDescription ? { longDescription } : {}),
    ...(usageNotes ? { usageNotes } : {}),
    options,
    aliases,
  };
}

export async function parseJsonSchemaToCommandDescription(
  name: string,
  jsonPath: string,
  registry: json.schema.SchemaRegistry,
  schema: json.JsonObject,
): Promise<CommandDescription> {
  const subcommand =
    await parseJsonSchemaToSubCommandDescription(name, jsonPath, registry, schema);

  // Before doing any work, let's validate the implementation.
  if (typeof schema.$impl != 'string') {
    throw new Error(`Command ${name} has an invalid implementation.`);
  }
  const ref = new ExportStringRef<CommandConstructor>(schema.$impl, dirname(jsonPath));
  const impl = ref.ref;

  if (impl === undefined || typeof impl !== 'function') {
    throw new Error(`Command ${name} has an invalid implementation.`);
  }

  const scope = _getEnumFromValue(schema.$scope, CommandScope, CommandScope.Default);
  const hidden = !!schema.$hidden;

  return {
    ...subcommand,
    scope,
    hidden,
    impl,
  };
}

export async function parseJsonSchemaToOptions(
  registry: json.schema.SchemaRegistry,
  schema: json.JsonObject,
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
    const types = [...typeSet].filter(x => {
      switch (x) {
        case 'boolean':
        case 'number':
        case 'string':
          return true;

        case 'array':
          // Only include arrays if they're boolean, string or number.
          if (json.isJsonObject(current.items)
              && typeof current.items.type == 'string'
              && ['boolean', 'number', 'string'].includes(current.items.type)) {
            return true;
          }

          return false;

        default:
          return false;
      }
    }).map(x => _getEnumFromValue(x, OptionType, OptionType.String));

    if (types.length == 0) {
      // This means it's not usable on the command line. e.g. an Object.
      return;
    }

    // Only keep enum values we support (booleans, numbers and strings).
    const enumValues = (json.isJsonArray(current.enum) && current.enum || []).filter(x => {
      switch (typeof x) {
        case 'boolean':
        case 'number':
        case 'string':
          return true;

        default:
          return false;
      }
    }) as Value[];

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
    const $defaultIndex = (json.isJsonObject($default) && $default['$source'] == 'argv')
      ? $default['index'] : undefined;
    const positional: number | undefined = typeof $defaultIndex == 'number'
      ? $defaultIndex : undefined;

    const required = json.isJsonArray(current.required)
      ? current.required.indexOf(name) != -1 : false;
    const aliases = json.isJsonArray(current.aliases) ? [...current.aliases].map(x => '' + x)
      : current.alias ? ['' + current.alias] : [];
    const format = typeof current.format == 'string' ? current.format : undefined;
    const visible = current.visible === undefined || current.visible === true;
    const hidden = !!current.hidden || !visible;

    // Deprecated is set only if it's true or a string.
    const xDeprecated = current['x-deprecated'];
    const deprecated = (xDeprecated === true || typeof xDeprecated == 'string')
      ? xDeprecated : undefined;

    const xUserAnalytics = current['x-user-analytics'];
    const userAnalytics = typeof xUserAnalytics == 'number' ? xUserAnalytics : undefined;

    const option: Option = {
      name,
      description: '' + (current.description === undefined ? '' : current.description),
      ...types.length == 1 ? { type } : { type, types },
      ...defaultValue !== undefined ? { default: defaultValue } : {},
      ...enumValues && enumValues.length > 0 ? { enum: enumValues } : {},
      required,
      aliases,
      ...format !== undefined ? { format } : {},
      hidden,
      ...userAnalytics ? { userAnalytics } : {},
      ...deprecated !== undefined ? { deprecated } : {},
      ...positional !== undefined ? { positional } : {},
    };

    options.push(option);
  }

  const flattenedSchema = await registry.flatten(schema).toPromise();
  json.schema.visitJsonSchema(flattenedSchema, visitor);

  // Sort by positional.
  return options.sort((a, b) => {
    if (a.positional) {
      if (b.positional) {
        return a.positional - b.positional;
      } else {
        return 1;
      }
    } else if (b.positional) {
      return -1;
    } else {
      return 0;
    }
  });
}
