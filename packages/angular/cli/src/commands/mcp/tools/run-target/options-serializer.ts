/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { OptionValue } from './types';

/**
 * Serializes a Zod-validated options record into standard CLI argument flags.
 * Enforces strict regex validation on option keys to prevent flag manipulation.
 */
export function serializeOptions(
  options: Record<string, OptionValue> | undefined,
  excludeKeys: Set<string> = new Set(),
): string[] {
  const args: string[] = [];
  if (!options) {
    return args;
  }

  for (const [key, value] of Object.entries(options)) {
    if (excludeKeys.has(key)) {
      continue;
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(key)) {
      throw new Error(
        `Invalid option key: '${key}'. Option keys must be alphanumeric, hyphens, or underscores.`,
      );
    }

    if (typeof value === 'boolean') {
      args.push(value ? `--${key}` : `--no-${key}`);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        args.push(`--${key}=${item}`);
      }
    } else if (value !== null && value !== undefined) {
      args.push(`--${key}=${value}`);
    }
  }

  return args;
}
