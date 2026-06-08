/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';

export const workspaceAndProjectOptions = {
  workspace: z
    .string()
    .optional()
    .describe(
      'The path to the workspace directory (containing angular.json). If not provided, uses the current directory.',
    ),
  project: z
    .string()
    .optional()
    .describe(
      'Which project to target in a monorepo context. If not provided, targets the default project.',
    ),
};
