/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { NodeWorkflow } from '@angular-devkit/schematics/tools';
import { colors } from '../../utilities/color';

function removeLeadingSlash(value: string): string {
  return value[0] === '/' ? value.slice(1) : value;
}

export function subscribeToWorkflow(
  workflow: NodeWorkflow,
  logger: logging.LoggerApi,
): {
  files: Set<string>;
  error: boolean;
  unsubscribe: () => void;
} {
  const files = new Set<string>();
  let error = false;
  let logs: string[] = [];

  const reporterSubscription = workflow.reporter.subscribe((event) => {
    // Strip leading slash to prevent confusion.
    const eventPath = removeLeadingSlash(event.path);

    switch (event.kind) {
      case 'error':
        error = true;
        logger.error(
          `ERROR! ${eventPath} ${event.description == 'alreadyExist' ? 'already exists' : 'does not exist'}.`,
        );
        break;
      case 'update':
        logs.push(
          // TODO: `as unknown` was necessary during TS 5.9 update. Figure out a long-term solution.
          `${colors.cyan('UPDATE')} ${eventPath} (${(event.content as unknown as Buffer).length} bytes)`,
        );
        files.add(eventPath);
        break;
      case 'create':
        logs.push(
          // TODO: `as unknown` was necessary during TS 5.9 update. Figure out a long-term solution.
          `${colors.green('CREATE')} ${eventPath} (${(event.content as unknown as Buffer).length} bytes)`,
        );
        files.add(eventPath);
        break;
      case 'delete':
        logs.push(`${colors.yellow('DELETE')} ${eventPath}`);
        files.add(eventPath);
        break;
      case 'rename':
        logs.push(`${colors.blue('RENAME')} ${eventPath} => ${removeLeadingSlash(event.to)}`);
        files.add(eventPath);
        break;
    }
  });

  const lifecycleSubscription = workflow.lifeCycle.subscribe((event) => {
    if (event.kind == 'end' || event.kind == 'post-tasks-start') {
      if (!error) {
        // Output the logging queue, no error happened.
        logs.forEach((log) => logger.info(log));
      }

      logs = [];
      error = false;
    }
  });

  return {
    files,
    error,
    unsubscribe: () => {
      reporterSubscription.unsubscribe();
      lifecycleSubscription.unsubscribe();
    },
  };
}
