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

const BUILT_IN_COMMANDS = new Set([
  'build',
  'test',
  'e2e',
  'serve',
  'deploy',
  'extract-i18n',
  'lint',
]);

export class GenericTargetStrategy implements TargetStrategy {
  canHandle(targetName: string, builder?: string): boolean {
    return true; // Universal fallback strategy
  }

  async execute(
    input: StrategyExecutionContext,
    context: McpToolContext,
  ): Promise<RunTargetOutput> {
    if (input.targetName === 'serve' || input.options?.['watch'] === true) {
      throw new Error(
        `Watch mode execution (serve target or watch option) is not yet supported by 'run_target'. ` +
          `Please use the legacy 'devserver.start' / 'devserver.wait_for_build' tools instead.`,
      );
    }

    const args: string[] = [];
    if (BUILT_IN_COMMANDS.has(input.targetName)) {
      args.push(input.targetName, input.projectName);
    } else {
      args.push('run', `${input.projectName}:${input.targetName}`);
    }

    if (input.configuration) {
      args.push('-c', input.configuration);
    }

    let options = input.options;
    if (input.targetName === 'test') {
      options = {
        ...options,
        watch: false,
      };
    }

    args.push(...serializeOptions(options));

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
