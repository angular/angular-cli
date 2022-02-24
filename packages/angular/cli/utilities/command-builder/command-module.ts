/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { analytics, logging, strings } from '@angular-devkit/core';
import { ArgumentsCamelCase, Argv, CamelCaseKey, CommandModule as YargsCommandModule } from 'yargs';
import { createAnalytics } from '../../models/analytics';
import { AngularWorkspace } from '../config';

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
  private analytics: analytics.Analytics | undefined;
  static scope = CommandScope.Both;

  constructor(protected readonly context: CommandContext) {}

  abstract builder(argv: Argv): Promise<Argv<T>> | Argv<T>;
  abstract run(options: Options<T> & OtherOptions): Promise<number | void> | number | void;

  async handler(args: ArgumentsCamelCase<T> & OtherOptions): Promise<void> {
    const { _, $0, ...options } = args;

    const camelCasedOptions = {} as Options<T>;
    for (const [key, value] of Object.entries(options)) {
      camelCasedOptions[strings.camelize(key) as keyof Options<T>] = value;
    }

    const commandName = this.command.split(' ', 1)[0];
    if (!this.analytics) {
      this.analytics = await createAnalytics(!!this.context.workspace, commandName === 'update');
    }

    const startTime = Date.now();
    const result = await this.run(camelCasedOptions);

    const endTime = Date.now();
    this.analytics.timing(commandName, 'duration', endTime - startTime);

    if (typeof result === 'number') {
      process.exit(result);
    }
  }
}
