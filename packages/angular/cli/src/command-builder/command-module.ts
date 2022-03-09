/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { analytics, logging, normalize, schema, strings } from '@angular-devkit/core';
import { readFileSync } from 'fs';
import * as path from 'path';
import {
  ArgumentsCamelCase,
  Argv,
  CamelCaseKey,
  PositionalOptions,
  CommandModule as YargsCommandModule,
  Options as YargsOptions,
} from 'yargs';
import { Parser as yargsParser } from 'yargs/helpers';
import { createAnalytics } from '../analytics/analytics';
import { AngularWorkspace } from '../utilities/config';
import { Option } from './utilities/json-schema';

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
  /** Arguments parsed in free-from without parser configuration. */
  args: {
    positional: string[];
    options: {
      help: boolean;
    } & Record<string, unknown>;
  };
}

export type OtherOptions = Record<string, unknown>;

export interface CommandModuleImplementation<T extends {} = {}>
  extends Omit<YargsCommandModule<{}, T>, 'builder' | 'handler'> {
  /** Path used to load the long description for the command in JSON help text. */
  longDescriptionPath?: string;
  /** Object declaring the options the command accepts, or a function accepting and returning a yargs instance. */
  builder(argv: Argv): Promise<Argv<T>> | Argv<T>;
  /** A function which will be passed the parsed argv. */
  run(options: Options<T> & OtherOptions): Promise<number | void> | number | void;
}

export interface FullDescribe {
  describe?: string;
  longDescription?: string;
  longDescriptionRelativePath?: string;
}

export abstract class CommandModule<T extends {} = {}> implements CommandModuleImplementation<T> {
  abstract readonly command: string;
  abstract readonly describe: string | false;
  abstract readonly longDescriptionPath?: string;
  protected shouldReportAnalytics = true;
  static scope = CommandScope.Both;

  private readonly optionsWithAnalytics = new Map<string, number>();

  constructor(protected readonly context: CommandContext) {}

  /**
   * Description object which contains the long command descroption.
   * This is used to generate JSON help wich is used in AIO.
   *
   * `false` will result in a hidden command.
   */
  public get fullDescribe(): FullDescribe | false {
    return this.describe === false
      ? false
      : {
          describe: this.describe,
          ...(this.longDescriptionPath
            ? {
                longDescriptionRelativePath: path
                  .relative(path.join(__dirname, '../../../../'), this.longDescriptionPath)
                  .replace(/\\/g, path.posix.sep),
                longDescription: readFileSync(this.longDescriptionPath, 'utf8'),
              }
            : {}),
        };
  }

  protected get commandName(): string {
    return this.command.split(' ', 1)[0];
  }

  abstract builder(argv: Argv): Promise<Argv<T>> | Argv<T>;
  abstract run(options: Options<T> & OtherOptions): Promise<number | void> | number | void;

  async handler(args: ArgumentsCamelCase<T> & OtherOptions): Promise<void> {
    const { _, $0, ...options } = args;

    // Camelize options as yargs will return the object in kebab-case when camel casing is disabled.
    const camelCasedOptions: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(options)) {
      camelCasedOptions[yargsParser.camelCase(key)] = value;
    }

    // Gather and report analytics.
    const analytics = await this.getAnalytics();
    if (this.shouldReportAnalytics) {
      await this.reportAnalytics(camelCasedOptions);
    }

    let exitCode: number | void | undefined;
    try {
      // Run and time command.
      const startTime = Date.now();
      exitCode = await this.run(camelCasedOptions as Options<T> & OtherOptions);
      const endTime = Date.now();
      analytics.timing(this.commandName, 'duration', endTime - startTime);
      await analytics.flush();
    } catch (e) {
      if (e instanceof schema.SchemaValidationException) {
        this.context.logger.fatal(`Error: ${e.message}`);
        exitCode = 1;
      } else {
        throw e;
      }
    } finally {
      if (typeof exitCode === 'number' && exitCode > 0) {
        process.exitCode = exitCode;
      }
    }
  }

  async reportAnalytics(
    options: (Options<T> & OtherOptions) | OtherOptions,
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
  protected async getAnalytics(): Promise<analytics.Analytics> {
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

      // Record option of analytics.
      if (userAnalytics !== undefined) {
        this.optionsWithAnalytics.set(name, userAnalytics);
      }
    }

    return localYargs;
  }

  protected getWorkspaceOrThrow(): AngularWorkspace {
    const { workspace } = this.context;
    if (!workspace) {
      throw new CommandModuleError('A workspace is required for this command.');
    }

    return workspace;
  }
}

/**
 * Creates an known command module error.
 * This is used so during executation we can filter between known validation error and real non handled errors.
 */
export class CommandModuleError extends Error {}
