/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 * Utility functions shared across MCP tools.
 */

import { CommandError } from './host';

/**
 * Returns simple structured content output from an MCP tool.
 *
 * @returns A structure with both `content` and `structuredContent` for maximum compatibility.
 */
export function createStructuredContentOutput<OutputType>(structuredContent: OutputType) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent,
  };
}

/**
 * Get the logs of a failing command.
 *
 * This call has fallbacks in case the exception was thrown from the command-calling code itself.
 */
export function getCommandErrorLogs(e: unknown): string[] {
  if (e instanceof CommandError) {
    return [...e.logs, e.message];
  } else if (e instanceof Error) {
    return [e.message];
  } else {
    return [String(e)];
  }
}
