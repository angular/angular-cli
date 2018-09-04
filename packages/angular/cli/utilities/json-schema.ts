/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json } from '@angular-devkit/core';
import { ExportStringRef } from '@angular-devkit/schematics/tools';
import { dirname } from 'path';
import {
  CommandConstructor,
  CommandDescription,
  CommandScope,
  CommandType,
  Option,
  OptionType,
} from '../models/interface';

function _getEnumFromValue<E, T extends string>(v: json.JsonValue, e: E, d: T): T {
  if (typeof v !== 'string') {
    return d;
  }

  if (Object.values(e).indexOf(v) !== -1) {
    return v as T;
  }

  return d;
}

export async function parseJsonSchemaToCommandDescription(
  name: string,
  jsonPath: string,
  registry: json.schema.SchemaRegistry,
  schema: json.JsonObject,
): Promise<CommandDescription> {
  // Before doing any work, let's validate the implementation.
  if (typeof schema.$impl != 'string') {
    throw new Error(`Command ${name} has an invalid implementation.`);
  }
  const ref = new ExportStringRef<CommandConstructor>(schema.$impl, dirname(jsonPath));
  const impl = ref.ref;

  if (impl === undefined || typeof impl !== 'function') {
    throw new Error(`Command ${name} has an invalid implementation.`);
  }

  const options = await parseJsonSchemaToOptions(registry, schema);

  const aliases: string[] = [];
  if (json.isJsonArray(schema.$aliases)) {
    schema.$aliases.forEach(value => {
      if (typeof value == 'string') {
        aliases.push(value);
      }
    });
  }

  const scope = _getEnumFromValue(schema.$scope, CommandScope, CommandScope.Default);
  const type = _getEnumFromValue(schema.$type, CommandType, CommandType.Default);
  const description = '' + (schema.description === undefined ? '' : schema.description);
  const hidden = !!schema.$hidden;

  return { name, description, hidden, type, options, aliases, scope, impl };
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

    let defaultValue: string | number | boolean | undefined = undefined;
    if (schema.default !== undefined) {
      switch (types[0]) {
        case 'string':
          if (typeof schema.default == 'string') {
            defaultValue = schema.default;
          }
          break;
        case 'number':
          if (typeof schema.default == 'number') {
            defaultValue = schema.default;
          }
          break;
        case 'boolean':
          if (typeof schema.default == 'boolean') {
            defaultValue = schema.default;
          }
          break;
      }
    }

    const $default = current.$default;
    const $defaultIndex = (json.isJsonObject($default) && $default['$source'] == 'argv')
      ? $default['index'] : undefined;
    const positional: number | undefined = typeof $defaultIndex == 'number'
      ? $defaultIndex : undefined;

    const required = json.isJsonArray(current.required)
        ? current.required.indexOf(name) != -1 : false;
    const aliases = json.isJsonArray(current.aliases) ? [...current.aliases].map(x => '' + x) : [];
    const format = typeof current.format == 'string' ? current.format : undefined;
    const hidden = !!current.hidden;

    const option: Option = {
      name,
      description: '' + (current.description === undefined ? '' : current.description),
      ...types.length == 1 ? { type: types[0] } : { type: types[0], types },
      ...defaultValue !== undefined ? { default: defaultValue } : {},
      required,
      aliases,
      ...format !== undefined ? { format } : {},
      hidden,
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
