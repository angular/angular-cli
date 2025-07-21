/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Argv } from 'yargs';
import { FullDescribe } from '../command-module';

interface JsonHelpOption {
  name: string;
  type?: string;
  deprecated: boolean | string;
  aliases?: string[];
  default?: string;
  required?: boolean;
  positional?: number;
  enum?: string[];
  description?: string;
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
  subcommands?: JsonHelpSubcommand[];
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

  const output: JsonHelp = {
    name: [...context.commands].pop(),
    command: `${command?.replace(yargsDefaultCommandRegExp, localYargsInstance['$0'])}${defaultSubCommand}`,
    ...parseDescription(rawDescription),
    options: normalizeOptions.sort((a, b) => a.name.localeCompare(b.name)),
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
