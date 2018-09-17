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

  type: OptionType | 'suboption';
  types?: OptionType[];

  aliases: string[];
  required?: boolean;
  format?: string;
  hidden?: boolean;
  default?: string | number | boolean;
  positional?: number;
  $default?: OptionSmartDefault;
}

export enum CommandScope {
  InProject = 'in',
  OutProject = 'out',
  Everywhere = 'all',

  Default = InProject,
}

export enum CommandType {
  Custom = 'custom',
  Architect = 'architect',
  Schematic = 'schematics',

  Default = Custom,
}

/**
 * A description of a command, its metadata.
 */
export interface CommandDescription {
  name: string;
  description: string;

  /**
   * A long description of the option, in Markdown format.
   */
  longDescription?: string;

  /**
   * Additional notes about usage of this command.
   */
  usageNotes?: string;

  options: Option[];

  aliases: string[];
  scope: CommandScope;
  type: CommandType;

  impl: CommandConstructor;

  hidden: boolean;
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
