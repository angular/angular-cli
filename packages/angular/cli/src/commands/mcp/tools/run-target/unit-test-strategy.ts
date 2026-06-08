/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { getCommandErrorLogs } from '../../utils';
import type { McpToolContext } from '../tool-registry';
import { serializeOptions } from './options-serializer';
import type { TargetStrategy } from './strategy';
import type { RunTargetOutput, StrategyExecutionContext } from './types';

export class UnitTestTargetStrategy implements TargetStrategy {
  canHandle(targetName: string, builder?: string): boolean {
    return (
      targetName === 'test' &&
      (builder === '@angular-devkit/build-angular:karma' ||
        builder === '@angular/build:karma' ||
        builder === '@angular/build:unit-test')
    );
  }

  async execute(
    input: StrategyExecutionContext,
    context: McpToolContext,
  ): Promise<RunTargetOutput> {
    const args = ['test', input.projectName];
    if (input.configuration) {
      args.push('-c', input.configuration);
    }

    const builder = input.targetDefinition?.builder;

    if (builder === '@angular/build:unit-test') {
      const isKarma = input.targetDefinition?.options?.['runner'] === 'karma';
      if (isKarma) {
        args.push('--browsers', 'ChromeHeadless');
      } else {
        args.push('--headless', 'true');
      }
    } else {
      // Default Karma-based builders require explicit ChromeHeadless
      args.push('--browsers', 'ChromeHeadless');
    }

    // Force non-interactive one-off execution
    args.push('--watch', 'false');

    args.push(...serializeOptions(input.options, new Set(['watch'])));

    let status: 'success' | 'failure' = 'success';
    let logs: string[];

    try {
      const result = await context.host.executeNgCommand(args, { cwd: input.workspacePath });
      logs = result.logs;
    } catch (e) {
      status = 'failure';
      logs = getCommandErrorLogs(e);
    }

    return { status, logs };
  }
}
