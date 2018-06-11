/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { logging, terminal } from '@angular-devkit/core';

export interface CommandConstructor {
  new(context: CommandContext, logger: logging.Logger): Command;
  aliases: string[];
  scope: CommandScope.everywhere;
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

  printHelp(_options: T): void {
    this.printHelpUsage(this.name, this.arguments, this.options);
    this.printHelpOptions(this.options);
  }

  protected printHelpUsage(name: string, args: string[], options: Option[]) {
    const argDisplay = args && args.length > 0
      ? ' ' + args.map(a => `<${a}>`).join(' ')
      : '';
    const optionsDisplay = options && options.length > 0
      ? ` [options]`
      : ``;
    this.logger.info(`usage: ng ${name}${argDisplay}${optionsDisplay}`);
  }

  protected printHelpOptions(options: Option[]) {
    if (options && this.options.length > 0) {
      this.logger.info(`options:`);
      this.options
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
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly arguments: string[];
  abstract readonly options: Option[];
  public argStrategy = ArgumentStrategy.MapToOptions;
  public hidden = false;
  public unknown = false;
  public scope = CommandScope.everywhere;
  protected readonly logger: logging.Logger;
  protected readonly project: any;
}

export interface CommandContext {
  project: any;
}

export abstract class Option {
  abstract readonly name: string;
  abstract readonly description: string;
  readonly default?: string | number | boolean;
  readonly required?: boolean;
  abstract readonly aliases?: string[];
  abstract readonly type: any;
  readonly format?: string;
  readonly values?: any[];
  readonly hidden?: boolean = false;
}
