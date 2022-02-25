/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { analytics, logging, normalize, strings } from '@angular-devkit/core';
import * as path from 'path';
import {
  ArgumentsCamelCase,
  Argv,
  CamelCaseKey,
  PositionalOptions,
  CommandModule as YargsCommandModule,
  Options as YargsOptions,
} from 'yargs';
import { createAnalytics } from '../../models/analytics';
import { AngularWorkspace } from '../config';
import { Option } from './json-schema';

export type Options<T> = { [key in keyof T as CamelCaseKey<key>]: T[key] };

export enum CommandScope {
  /** Command can only run inside an Angular workspace. */
  In,
  /** Command can only run outside an Angular workspace. */
  Out,
  /** Command can run inside and outside an Angular workspace. */
  Both,
}

export interface CommandContext {
  currentDirectory: string;
  root: string;
  workspace?: AngularWorkspace;
  logger: logging.Logger;
  args: {
    positional: string[];
    options: {
      help: boolean;
    } & Record<string, unknown>;
  };
}

export type OtherOptions = Record<string, unknown>;

export interface CommandModuleImplementation<T extends {} = {}>
  extends Omit<YargsCommandModule<{}, T>, 'builder'> {
  builder(argv: Argv): Promise<Argv<T>> | Argv<T>;
  run(options: Options<T> & OtherOptions): Promise<number | void> | number | void;
}

export abstract class CommandModule<T extends {} = {}> implements CommandModuleImplementation<T> {
  abstract readonly command: string;
  abstract readonly describe: string | false;
  protected shouldReportAnalytics = true;
  static scope = CommandScope.Both;

  private readonly optionsWithAnalytics = new Map<string, number>();

  constructor(protected readonly context: CommandContext) {}

  protected get commandName(): string {
    return this.command.split(' ', 1)[0];
  }

  abstract builder(argv: Argv): Promise<Argv<T>> | Argv<T>;
  abstract run(options: Options<T> & OtherOptions): Promise<number | void> | number | void;

  async handler(args: ArgumentsCamelCase<T> & OtherOptions): Promise<void> {
    const { _, $0, ...options } = args;

    const camelCasedOptions = {} as Options<T>;
    for (const [key, value] of Object.entries(options)) {
      camelCasedOptions[strings.camelize(key) as keyof Options<T>] = value;
    }

    // Gather and report analytics.
    const analytics = await this.getAnalytics();
    if (this.shouldReportAnalytics) {
      await this.reportAnalytics(camelCasedOptions);
    }

    // Run command
    const startTime = Date.now();
    const result = await this.run(camelCasedOptions);
    const endTime = Date.now();

    analytics.timing(this.commandName, 'duration', endTime - startTime);

    if (typeof result === 'number' && result > 0) {
      process.exitCode = result;
    }
  }

  async reportAnalytics(
    options: Options<T> & OtherOptions,
    paths: string[] = [],
    dimensions: (boolean | number | string)[] = [],
  ): Promise<void> {
    for (const [name, ua] of this.optionsWithAnalytics) {
      const value = options[name];

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        dimensions[ua] = value;
      }
    }

    const analytics = await this.getAnalytics();
    analytics.pageview('/command/' + [this.commandName, ...paths].join('/'), {
      dimensions,
      metrics: [],
    });
  }

  private _analytics: analytics.Analytics | undefined;
  private async getAnalytics(): Promise<analytics.Analytics> {
    if (this._analytics) {
      return this._analytics;
    }

    return (this._analytics = await createAnalytics(
      !!this.context.workspace,
      this.commandName === 'update',
    ));
  }

  /**
   * Adds schema options to a command also this keeps track of options that are required for analytics.
   * **Note:** This method should be called from the command bundler method.
   */
  protected addSchemaOptionsToCommand<T>(localYargs: Argv<T>, options: Option[]): Argv<T> {
    const workingDir = normalize(path.relative(this.context.root, process.cwd()));

    for (const option of options) {
      const {
        default: defaultVal,
        positional,
        deprecated,
        description,
        alias,
        userAnalytics,
        type,
        hidden,
        name,
        choices,
        format,
      } = option;

      const sharedOptions: YargsOptions & PositionalOptions = {
        alias,
        hidden,
        description,
        deprecated,
        choices,
        // This should only be done when `--help` is used otherwise default will override options set in angular.json.
        ...(this.context.args.options.help ? { default: defaultVal } : {}),
      };

      // Special case for schematics
      if (workingDir && format === 'path' && name === 'path' && hidden) {
        sharedOptions.default = workingDir;
      }

      if (positional === undefined) {
        localYargs = localYargs.option(strings.dasherize(name), {
          type,
          ...sharedOptions,
        });
      } else {
        localYargs = localYargs.positional(strings.dasherize(name), {
          type: type === 'array' || type === 'count' ? 'string' : type,
          ...sharedOptions,
        });
      }

      // Record option of analytics
      if (userAnalytics !== undefined) {
        this.optionsWithAnalytics.set(name, userAnalytics);
      }
    }

    return localYargs;
  }
}
