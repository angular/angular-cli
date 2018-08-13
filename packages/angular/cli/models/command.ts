/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { JsonValue, logging, terminal } from '@angular-devkit/core';

export interface CommandConstructor {
  new(context: CommandContext, logger: logging.Logger): Command;
  readonly name: string;
  aliases: string[];
  scope: CommandScope;
}

export enum CommandScope {
  everywhere,
  inProject,
  outsideProject,
}

export enum ArgumentStrategy {
  MapToOptions,
  Nothing,
}

export abstract class Command<T = any> {
  protected _rawArgs: string[];
  public allowMissingWorkspace = false;

  constructor(context: CommandContext, logger: logging.Logger) {
    this.logger = logger;
    if (context) {
      this.project = context.project;
    }
  }

  public addOptions(options: Option[]) {
    this.options = (this.options || []).concat(options);
  }

  async initializeRaw(args: string[]): Promise<any> {
    this._rawArgs = args;

    return args;
  }
  async initialize(_options: any): Promise<void> {
    return;
  }

  validate(_options: T): boolean | Promise<boolean> {
    return true;
  }

  printHelp(commandName: string, description: string, options: any): void {
    if (description) {
      this.logger.info(description);
    }
    this.printHelpUsage(commandName, this.options);
    this.printHelpOptions(this.options);
  }

  private _getArguments(options: Option[]) {
    function _getArgIndex(def: OptionSmartDefault | undefined): number {
      if (def === undefined || def.$source !== 'argv' || typeof def.index !== 'number') {
        // If there's no proper order, this argument is wonky. We will show it at the end only
        // (after all other arguments).
        return Infinity;
      }

      return def.index;
    }

    return options
      .filter(opt => this.isArgument(opt))
      .sort((a, b) => _getArgIndex(a.$default) - _getArgIndex(b.$default));
  }

  protected printHelpUsage(name: string, options: Option[]) {
    const args = this._getArguments(options);
    const opts = options.filter(opt => !this.isArgument(opt));
    const argDisplay = args && args.length > 0
      ? ' ' + args.map(a => `<${a.name}>`).join(' ')
      : '';
    const optionsDisplay = opts && opts.length > 0
      ? ` [options]`
      : ``;
    this.logger.info(`usage: ng ${name}${argDisplay}${optionsDisplay}`);
  }

  protected isArgument(option: Option) {
    let isArg = false;
    if (option.$default !== undefined && option.$default.$source === 'argv') {
      isArg = true;
    }

    return isArg;
  }

  protected printHelpOptions(options: Option[]) {
    if (!options) {
      return;
    }
    const args = options.filter(opt => this.isArgument(opt));
    const opts = options.filter(opt => !this.isArgument(opt));
    if (args.length > 0) {
      this.logger.info(`arguments:`);
      args.forEach(o => {
        this.logger.info(`  ${terminal.cyan(o.name)}`);
        this.logger.info(`    ${o.description}`);
      });
    }
    if (this.options.length > 0) {
      this.logger.info(`options:`);
      opts
        .filter(o => !o.hidden)
        .sort((a, b) => a.name >= b.name ? 1 : -1)
        .forEach(o => {
          const aliases = o.aliases && o.aliases.length > 0
            ? '(' + o.aliases.map(a => `-${a}`).join(' ') + ')'
            : '';
          this.logger.info(`  ${terminal.cyan('--' + o.name)} ${aliases}`);
          this.logger.info(`    ${o.description}`);
        });
    }
  }

  abstract run(options: T): number | void | Promise<number | void>;
  public options: Option[];
  public additionalSchemas: string[] = [];
  protected readonly logger: logging.Logger;
  protected readonly project: any;
}

export interface CommandContext {
  project: any;
}

export interface Option {
  name: string;
  description: string;
  type: string;
  default?: string | number | boolean;
  required?: boolean;
  aliases?: string[];
  format?: string;
  hidden?: boolean;
  $default?: OptionSmartDefault;
}

export interface OptionSmartDefault {
  $source: string;
  [key: string]: JsonValue;
}
