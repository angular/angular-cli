/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json, logging } from '@angular-devkit/core';

/**
 * Value type of arguments.
 */
export type Value = number | string | boolean | (number | string | boolean)[];

/**
 * An object representing parsed arguments from the command line.
 */
export interface Arguments {
  [argName: string]: Value | undefined;

  /**
   * Extra arguments that were not parsed. Will be omitted if all arguments were parsed.
   */
  '--'?: string[];
}

/**
 * The base interface for Command, understood by the command runner.
 */
export interface CommandInterface<T extends Arguments = Arguments> {
  printHelp(options: T): Promise<number>;
  printJsonHelp(options: T): Promise<number>;
  validateAndRun(options: T): Promise<number>;
}

/**
 * Command constructor.
 */
export interface CommandConstructor {
  new(
    context: CommandContext,
    description: CommandDescription,
    logger: logging.Logger,
  ): CommandInterface;
}

/**
 * A CLI workspace information.
 */
export interface CommandWorkspace {
  root: string;
  configFile?: string;
}

/**
 * A command runner context.
 */
export interface CommandContext {
  workspace: CommandWorkspace;
}

/**
 * Value types of an Option.
 */
export enum OptionType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Array = 'array',
  Any = 'any',
}

/**
 * An option description. This is exposed when using `ng --help-json`.
 */
export interface Option {
  /**
   * The name of the option.
   */
  name: string;

  /**
   * A short description of the option.
   */
  description: string;

  /**
   * The type of option value. If multiple types exist, this type will be the first one, and the
   * types array will contain all types accepted.
   */
  type: OptionType | 'suboption';

  /**
   * {@see type}
   */
  types?: OptionType[];

  /**
   * Aliases supported by this option.
   */
  aliases: string[];

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
   * Default value of this option.
   */
  default?: string | number | boolean;

  /**
   * If this option can be used as an argument, the position of the argument. Otherwise omitted.
   */
  positional?: number;

  /**
   * Smart default object.
   */
  $default?: OptionSmartDefault;
}

/**
 * Scope of the command.
 */
export enum CommandScope {
  InProject = 'in',
  OutProject = 'out',
  Everywhere = 'all',

  Default = InProject,
}

/**
 * A description of a command, its metadata.
 */
export interface CommandDescription {
  /**
   * Name of the command.
   */
  name: string;

  /**
   * Short description (1-2 lines) of this command.
   */
  description: string;

  /**
   * A long description of the option, in Markdown format.
   */
  longDescription?: string;

  /**
   * Additional notes about usage of this command.
   */
  usageNotes?: string;

  /**
   * List of all supported options.
   */
  options: Option[];

  /**
   * Aliases supported for this command.
   */
  aliases: string[];

  /**
   * Scope of the command, whether it can be executed in a project, outside of a project or
   * anywhere.
   */
  scope: CommandScope;

  /**
   * Whether this command should be hidden from a list of all commands.
   */
  hidden: boolean;

  /**
   * The constructor of the command, which should be extending the abstract Command<> class.
   */
  impl: CommandConstructor;

  /**
   * Suboptions.
   */
  suboptions?: {
    [name: string]: Option[];
  };
}

export interface OptionSmartDefault {
  $source: string;
  [key: string]: json.JsonValue;
}

export interface CommandDescriptionMap {
  [key: string]: CommandDescription;
}
