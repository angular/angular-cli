/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { strings } from '@angular-devkit/core';
import { Argv } from 'yargs';
import { FullDescribe } from '../command-module';
import { Option } from './json-schema';

export interface JsonHelpOption {
  name: string;
  type?: string;
  deprecated?: boolean | string;
  aliases?: string[];
  default?: string | number | boolean | unknown[];
  required?: boolean;
  positional?: number;
  enum?: (string | number | boolean)[];
  description?: string;
}

/**
 * Represents a builder and its associated CLI options in JSON help output.
 */
export interface JsonHelpBuilder {
  name: string;
  options: JsonHelpOption[];
}

interface JsonHelpDescription {
  shortDescription?: string;
  longDescription?: string;
  longDescriptionRelativePath?: string;
}

interface JsonHelpSubcommand extends JsonHelpDescription {
  name: string;
  aliases: string[];
  deprecated: string | boolean;
}

export interface JsonHelp extends JsonHelpDescription {
  name: string;
  command: string;
  options: JsonHelpOption[];
  builders?: JsonHelpBuilder[];
  subcommands?: JsonHelpSubcommand[];
}

const jsonHelpBuilders = new WeakMap<Argv, JsonHelpBuilder[]>();

/**
 * Associates a list of builder option groups with a yargs instance for `--json-help` serialization.
 */
export function setJsonHelpBuilders(localYargs: Argv, builders: JsonHelpBuilder[]): void {
  jsonHelpBuilders.set(localYargs, builders);
}

/**
 * Converts parsed JSON schema options into normalized and sorted `JsonHelpOption` entries.
 */
export function schemaOptionsToJsonHelpOptions(options: Option[]): JsonHelpOption[] {
  const normalizeOptions: JsonHelpOption[] = [];

  for (const option of options) {
    if (option.hidden) {
      continue;
    }

    let dashedName = strings.dasherize(option.name);
    if (option.type === 'boolean' && dashedName.startsWith('no-')) {
      dashedName = dashedName.slice(3);
    }

    const alias = Array.isArray(option.alias)
      ? option.alias
      : option.alias
        ? [option.alias]
        : undefined;

    normalizeOptions.push({
      name: dashedName,
      type: option.type,
      deprecated: option.deprecated,
      aliases: alias && alias.length > 0 ? alias : undefined,
      default: option.default as JsonHelpOption['default'],
      enum: option.choices?.length ? (option.choices as JsonHelpOption['enum']) : undefined,
      description: option.description,
      positional: option.positional,
    });
  }

  return normalizeOptions.sort((a, b) => a.name.localeCompare(b.name));
}

const yargsDefaultCommandRegExp = /^\$0|\*/;

export function jsonHelpUsage(localYargs: Argv): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localYargsInstance = localYargs as any;
  const {
    deprecatedOptions,
    alias: aliases,
    array,
    string,
    boolean,
    number,
    choices,
    demandedOptions,
    default: defaultVal,
    hiddenOptions = [],
  } = localYargsInstance.getOptions();

  const internalMethods = localYargsInstance.getInternalMethods();
  const usageInstance = internalMethods.getUsageInstance();
  const context = internalMethods.getContext();
  const descriptions = usageInstance.getDescriptions();
  const groups = localYargsInstance.getGroups();
  const positional = groups[usageInstance.getPositionalGroupName()] as string[] | undefined;
  const seen = new Set<string>();
  const hidden = new Set(hiddenOptions);
  const normalizeOptions: JsonHelpOption[] = [];
  const allAliases = new Set([...Object.values<string[]>(aliases).flat()]);

  // Reverted order of https://github.com/yargs/yargs/blob/971e351705f0fbc5566c6ed1dfd707fa65e11c0d/lib/usage.ts#L419-L424
  for (const [names, type] of [
    [number, 'number'],
    [array, 'array'],
    [string, 'string'],
    [boolean, 'boolean'],
  ]) {
    for (const name of names) {
      if (allAliases.has(name) || hidden.has(name) || seen.has(name)) {
        // Ignore hidden, aliases and already visited option.
        continue;
      }

      seen.add(name);
      const positionalIndex = positional?.indexOf(name) ?? -1;
      const alias = aliases[name];

      normalizeOptions.push({
        name,
        type,
        deprecated: deprecatedOptions[name],
        aliases: alias?.length > 0 ? alias : undefined,
        default: defaultVal[name],
        required: demandedOptions[name],
        enum: choices[name],
        description: descriptions[name]?.replace('__yargsString__:', ''),
        positional: positionalIndex >= 0 ? positionalIndex : undefined,
      });
    }
  }

  // https://github.com/yargs/yargs/blob/00e4ebbe3acd438e73fdb101e75b4f879eb6d345/lib/usage.ts#L124
  const subcommands = (
    usageInstance.getCommands() as [
      name: string,
      description: string,
      isDefault: boolean,
      aliases: string[],
      deprecated: string | boolean,
    ][]
  )
    .map(([name, rawDescription, isDefault, aliases, deprecated]) => ({
      name: name.split(' ', 1)[0].replace(yargsDefaultCommandRegExp, ''),
      command: name.replace(yargsDefaultCommandRegExp, ''),
      default: isDefault || undefined,
      ...parseDescription(rawDescription),
      aliases,
      deprecated,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const [command, rawDescription] = usageInstance.getUsage()[0] ?? [];
  const defaultSubCommand = subcommands.find((x) => x.default)?.command ?? '';
  const otherSubcommands = subcommands.filter((s) => !s.default);
  const builders = jsonHelpBuilders.get(localYargs);

  const output: JsonHelp = {
    name: [...context.commands].pop(),
    command: `${command?.replace(yargsDefaultCommandRegExp, localYargsInstance['$0'])}${defaultSubCommand}`,
    ...parseDescription(rawDescription),
    options: normalizeOptions.sort((a, b) => a.name.localeCompare(b.name)),
    builders: builders?.length ? builders : undefined,
    subcommands: otherSubcommands.length ? otherSubcommands : undefined,
  };

  return JSON.stringify(output, undefined, 2);
}

function parseDescription(rawDescription: string): JsonHelpDescription {
  try {
    const {
      longDescription,
      describe: shortDescription,
      longDescriptionRelativePath,
    } = JSON.parse(rawDescription) as FullDescribe;

    return {
      shortDescription,
      longDescriptionRelativePath,
      longDescription,
    };
  } catch {
    return {
      shortDescription: rawDescription,
    };
  }
}
