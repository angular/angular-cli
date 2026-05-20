/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { workspaceAndProjectOptions } from '../../shared-options';

export const optionValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number()])),
]);

export type OptionValue = z.infer<typeof optionValueSchema>;

export const runTargetInputSchema = z.object({
  ...workspaceAndProjectOptions,
  target: z
    .string()
    .describe('The project target to execute (e.g., "build", "test", "lint", "e2e", "deploy").'),
  configuration: z
    .string()
    .optional()
    .describe('Target configuration (e.g., "development", "production").'),
  options: z
    .record(z.string(), optionValueSchema)
    .optional()
    .describe('Optional key-value options to override the configured target options.'),
});

export type RunTargetInput = z.infer<typeof runTargetInputSchema>;

export const runTargetOutputSchema = z.object({
  status: z.enum(['success', 'failure']).describe('Execution status.'),
  logs: z.array(z.string()).describe('Clean, line-buffered output logs from execution.'),
  extensions: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Specialized metadata populated by specific target strategies.'),
});

export type RunTargetOutput = z.infer<typeof runTargetOutputSchema>;

export interface StrategyExecutionContext {
  workspacePath: string;
  projectName: string;
  targetName: string;
  targetDefinition?: {
    builder: string;
    options?: Record<string, unknown>;
    configurations?: Record<string, Record<string, unknown> | undefined>;
  };
  configuration?: string;
  options?: Record<string, OptionValue>;
}
