/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { McpServer } from '@modelcontextprotocol/server';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore strict-deps: Markdown files are asset dependencies bundled/loaded at runtime
import bestPracticesText from './best-practices.md';

export function registerInstructionsResource(server: McpServer): void {
  server.registerResource(
    'instructions',
    'instructions://best-practices',
    {
      title: 'Angular Best Practices and Code Generation Guide',
      description:
        "A comprehensive guide detailing Angular's best practices for code generation and development." +
        ' This guide should be used as a reference by an LLM to ensure any generated code' +
        ' adheres to modern Angular standards, including the use of standalone components,' +
        ' typed forms, modern control flow syntax, and other current conventions.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [{ uri: 'instructions://best-practices', text: bestPracticesText }],
    }),
  );
}
