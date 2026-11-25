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

  const normalizedExcludeKeys = new Set(
    [...excludeKeys].map((k) => k.toLowerCase().replace(/[-_]/g, '')),
  );

  for (const [key, value] of Object.entries(options)) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-_]*$/.test(key)) {
      throw new Error(
        `Invalid option key: '${key}'. Option keys must start with an alphanumeric character and ` +
          'contain only alphanumeric characters, hyphens, or underscores.',
      );
    }

    if (normalizedExcludeKeys.has(key.toLowerCase().replace(/[-_]/g, ''))) {
      continue;
    }

    if (typeof value === 'boolean') {
      args.push(value ? `--${key}` : `--no-${key}`);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.includes('\0')) {
          throw new Error(`Invalid option value for '${key}': values must not contain null bytes.`);
        }
        args.push(`--${key}=${item}`);
      }
    } else if (value !== null && value !== undefined) {
      if (typeof value === 'string' && value.includes('\0')) {
        throw new Error(`Invalid option value for '${key}': values must not contain null bytes.`);
      }
      args.push(`--${key}=${value}`);
    }
  }

  return args;
}
