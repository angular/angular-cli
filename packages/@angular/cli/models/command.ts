import { logging } from '@angular-devkit/core';
const { cyan } = require('chalk');

export interface CommandConstructor {
  new(context: CommandContext, logger: logging.Logger): Command;
  aliases: string[];
  scope: CommandScope.everywhere;
}

export enum CommandScope {
  everywhere,
  inProject,
  outsideProject
}

export enum ArgumentStrategy {
  MapToOptions,
  Nothing
}

export abstract class Command {
  protected _rawArgs: string[];

  constructor(context: CommandContext, logger: logging.Logger) {
    this.logger = logger;
    if (context) {
      this.project = context.project;
      this.ui = context.ui;
    }
  }

  async initializeRaw(args: string[]): Promise<any> {
    this._rawArgs = args;
    return args;
  }
  async initialize(_options: any): Promise<void> {
    return;
  }

  validate(_options: any): boolean | Promise<boolean> {
    return true;
  }

  printHelp(_options: any): void {
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
        .forEach(o => {
        const aliases = o.aliases && o.aliases.length > 0
          ? '(' + o.aliases.map(a => `-${a}`).join(' ') + ')'
          : '';
        this.logger.info(`  ${cyan(o.name)} ${aliases}`);
        this.logger.info(`    ${o.description}`);
      });
    }
  }

  abstract run(options: any): any | Promise<any>;
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
  protected readonly ui: Ui;
}

export interface CommandContext {
  ui: Ui;
  project: any;
}

export interface Ui {
  writeLine: (message: string) => void;
  errorLog: (message: string) => void;
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
