/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { analytics, logging } from '@angular-devkit/core';
import { Option } from '../src/command-builder/utilities/json-schema';
import { AngularWorkspace } from '../src/utilities/config';
import { CommandContext } from './interface';

export interface BaseCommandOptions {
  jsonHelp?: boolean;
}

export abstract class Command<T = {}> {
  protected allowMissingWorkspace = false;
  protected useReportAnalytics = true;
  readonly workspace?: AngularWorkspace;
  protected readonly analytics: analytics.Analytics;
  protected readonly commandOptions: Option[] = [];
  protected readonly logger: logging.Logger;

  constructor(protected readonly context: CommandContext, protected readonly commandName: string) {
    this.workspace = context.workspace;
    this.logger = context.logger;
    this.analytics = context.analytics || new analytics.NoopAnalytics();
  }

  async initialize(options: T): Promise<number | void> {}

  async reportAnalytics(
    paths: string[],
    options: T,
    dimensions: (boolean | number | string)[] = [],
    metrics: (boolean | number | string)[] = [],
  ): Promise<void> {
    for (const option of this.commandOptions) {
      const ua = option.userAnalytics;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = (options as any)[option.name];

      if (v !== undefined && !Array.isArray(v) && ua) {
        dimensions[ua] = v;
      }
    }

    this.analytics.pageview('/command/' + paths.join('/'), { dimensions, metrics });
  }

  abstract run(options: T): Promise<number | void>;

  async validateAndRun(options: T): Promise<number | void> {
    let result = await this.initialize(options);
    if (typeof result === 'number' && result !== 0) {
      return result;
    }

    const startTime = +new Date();
    if (this.useReportAnalytics) {
      await this.reportAnalytics([this.commandName], options);
    }
    result = await this.run(options);
    const endTime = +new Date();

    this.analytics.timing(this.commandName, 'duration', endTime - startTime);

    return result;
  }
}
