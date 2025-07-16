/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export function registerBestPracticesTool(server: McpServer): void {
  server.registerTool(
    'get_best_practices',
    {
      title: 'Get Angular Coding Best Practices Guide',
      description:
        'You **MUST** use this tool to retrieve the Angular Best Practices Guide ' +
        'before any interaction with Angular code (creating, analyzing, modifying). ' +
        'It is mandatory to follow this guide to ensure all code adheres to ' +
        'modern standards, including standalone components, typed forms, and ' +
        'modern control flow. This is the first step for any Angular task.',
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const text = await readFile(
        path.join(__dirname, '..', 'instructions', 'best-practices.md'),
        'utf-8',
      );

      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    },
  );
}
