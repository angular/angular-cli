/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json, logging } from '@angular-devkit/core';

export type Value = number | string | boolean | (number | string | boolean)[];

export type Arguments = {
  [argName: string]: Value;
} & {
  '--'?: string[];
}

export interface CommandInterface<T = {}> {
  initialize(options: T): Promise<void>;
  printHelp(options: T): Promise<number>;
  printJsonHelp(_options: T): Promise<number>;
  run(options: T & Arguments): Promise<number | void>;
  validateAndRun(options: T & Arguments): Promise<number | void>;
}

export interface CommandConstructor {
  new(
    context: CommandContext,
    description: CommandDescription,
    logger: logging.Logger,
  ): CommandInterface;
}

export interface CommandProject {
  root: string;
  configFile?: string;
}

export interface CommandContext {
  project: CommandProject;
}

export enum OptionType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Array = 'array',
  Any = 'any',
}

export interface Option {
  name: string;
  description: string;
  type: OptionType;
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

export interface CommandDescription {
  name: string;
  description: string;
  options: Option[];

  aliases: string[];
  scope: CommandScope;

  impl: CommandConstructor;

  hidden: boolean;

  type: CommandType;

  schematics?: {
    [name: string]: Option[];
  };
  architect?: {
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
