/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { McpToolContext } from '../tool-registry';
import type { RunTargetOutput, StrategyExecutionContext } from './types';

export interface TargetStrategy {
  /** Whether this strategy is responsible for handling the given target/builder */
  canHandle(target: string, builder?: string): boolean;

  /** Executes the target using this strategy */
  execute(input: StrategyExecutionContext, context: McpToolContext): Promise<RunTargetOutput>;
}
