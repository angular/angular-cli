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

export class BuildTargetStrategy implements TargetStrategy {
  canHandle(targetName: string, builder?: string): boolean {
    return (
      targetName === 'build' &&
      (builder === '@angular-devkit/build-angular:application' ||
        builder === '@angular-devkit/build-angular:browser' ||
        builder === '@angular/build:application' ||
        builder === '@angular-devkit/build-angular:ng-packagr')
    );
  }

  async execute(
    input: StrategyExecutionContext,
    context: McpToolContext,
  ): Promise<RunTargetOutput> {
    const args = ['build', input.projectName];
    if (input.configuration) {
      args.push('-c', input.configuration);
    }

    args.push(...serializeOptions(input.options));

    let status: 'success' | 'failure' = 'success';
    let logs: string[];

    try {
      const result = await context.host.executeNgCommand(args, { cwd: input.workspacePath });
      logs = result.logs;
    } catch (e) {
      status = 'failure';
      logs = getCommandErrorLogs(e);
    }

    let outputPath: string | undefined;
    for (const line of logs) {
      const match = line.match(/Output location: (.*)/);
      if (match) {
        outputPath = match[1].trim();
        break;
      }
    }

    return {
      status,
      logs,
      extensions: outputPath ? { outputPath } : undefined,
    };
  }
}
