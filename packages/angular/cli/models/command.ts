/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { analytics, logging, strings, tags } from '@angular-devkit/core';
import { colors } from '../utilities/color';
import { AngularWorkspace } from '../utilities/config';
import {
  Arguments,
  CommandContext,
  CommandDescription,
  CommandDescriptionMap,
  CommandScope,
  Option,
  SubCommandDescription,
} from './interface';

export interface BaseCommandOptions {
  help?: boolean | string;
}

export abstract class Command<T extends BaseCommandOptions = BaseCommandOptions> {
  protected allowMissingWorkspace = false;
  protected useReportAnalytics = true;
  readonly workspace?: AngularWorkspace;
  readonly analytics: analytics.Analytics;

  protected static commandMap: () => Promise<CommandDescriptionMap>;
  static setCommandMap(map: () => Promise<CommandDescriptionMap>) {
    this.commandMap = map;
  }

  constructor(
    protected readonly context: CommandContext,
    public readonly description: CommandDescription,
    protected readonly logger: logging.Logger,
  ) {
    this.workspace = context.workspace;
    this.analytics = context.analytics || new analytics.NoopAnalytics();
  }

  async initialize(options: T & Arguments): Promise<number | void> {}

  async printHelp(): Promise<number> {
    await this.printHelpUsage();
    await this.printHelpOptions();

    return 0;
  }

  async printJsonHelp(): Promise<number> {
    const replacer = (key: string, value: string) =>
      key === 'name' ? strings.dasherize(value) : value;
    this.logger.info(JSON.stringify(this.description, replacer, 2));

    return 0;
  }

  protected async printHelpUsage() {
    this.logger.info(this.description.description);

    const name = this.description.name;
    const args = this.description.options.filter((x) => x.positional !== undefined);
    const opts = this.description.options.filter((x) => x.positional === undefined);

    const argDisplay =
      args && args.length > 0 ? ' ' + args.map((a) => `<${a.name}>`).join(' ') : '';
    const optionsDisplay = opts && opts.length > 0 ? ` [options]` : ``;

    this.logger.info(`usage: ng ${name}${argDisplay}${optionsDisplay}`);
    this.logger.info('');
  }

  protected async printHelpOptions(options: Option[] = this.description.options) {
    const args = options.filter((opt) => opt.positional !== undefined);
    const opts = options.filter((opt) => opt.positional === undefined);

    const formatDescription = (description: string) =>
      `    ${description.replace(/\n/g, '\n    ')}`;

    if (args.length > 0) {
      this.logger.info(`arguments:`);
      args.forEach((o) => {
        this.logger.info(`  ${colors.cyan(o.name)}`);
        if (o.description) {
          this.logger.info(formatDescription(o.description));
        }
      });
    }
    if (options.length > 0) {
      if (args.length > 0) {
        this.logger.info('');
      }
      this.logger.info(`options:`);
      opts
        .filter((o) => !o.hidden)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((o) => {
          const aliases =
            o.aliases && o.aliases.length > 0
              ? '(' + o.aliases.map((a) => `-${a}`).join(' ') + ')'
              : '';
          this.logger.info(`  ${colors.cyan('--' + strings.dasherize(o.name))} ${aliases}`);
          if (o.description) {
            this.logger.info(formatDescription(o.description));
          }
        });
    }
  }

  async validateScope(scope?: CommandScope): Promise<void> {
    switch (scope === undefined ? this.description.scope : scope) {
      case CommandScope.OutProject:
        if (this.workspace) {
          this.logger.fatal(tags.oneLine`
            The ${this.description.name} command requires to be run outside of a project, but a
            project definition was found at "${this.workspace.filePath}".
          `);
          throw 1;
        }
        break;
      case CommandScope.InProject:
        if (!this.workspace) {
          this.logger.fatal(tags.oneLine`
            The ${this.description.name} command requires to be run in an Angular project, but a
            project definition could not be found.
          `);
          throw 1;
        }
        break;
      case CommandScope.Everywhere:
        // Can't miss this.
        break;
    }
  }

  async reportAnalytics(
    paths: string[],
    options: Arguments,
    dimensions: (boolean | number | string)[] = [],
    metrics: (boolean | number | string)[] = [],
  ): Promise<void> {
    for (const option of this.description.options) {
      const ua = option.userAnalytics;
      const v = options[option.name];

      if (v !== undefined && !Array.isArray(v) && ua) {
        dimensions[ua] = v;
      }
    }

    this.analytics.pageview('/command/' + paths.join('/'), { dimensions, metrics });
  }

  abstract run(options: T & Arguments): Promise<number | void>;

  async validateAndRun(options: T & Arguments): Promise<number | void> {
    if (!(options.help === true || options.help === 'json' || options.help === 'JSON')) {
      await this.validateScope();
    }
    let result = await this.initialize(options);
    if (typeof result === 'number' && result !== 0) {
      return result;
    }

    if (options.help === true) {
      return this.printHelp();
    } else if (options.help === 'json' || options.help === 'JSON') {
      return this.printJsonHelp();
    } else {
      const startTime = +new Date();
      if (this.useReportAnalytics) {
        await this.reportAnalytics([this.description.name], options);
      }
      result = await this.run(options);
      const endTime = +new Date();

      this.analytics.timing(this.description.name, 'duration', endTime - startTime);

      return result;
    }
  }
}
