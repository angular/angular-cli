/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';

export const findExampleInputSchema = z.object({
  workspacePath: z
    .string()
    .optional()
    .describe(
      'The absolute path to the `angular.json` file for the workspace. This is used to find the ' +
        'version-specific code examples that correspond to the installed version of the ' +
        'Angular framework. You **MUST** get this path from the `list_projects` tool. ' +
        'If omitted, the tool will search the generic code examples bundled with the CLI.',
    ),
  query: z
    .string()
    .describe(
      "The primary, conceptual search query. This should capture the user's main goal or question " +
        "(e.g., 'lazy loading a route' or 'how to use signal inputs'). The query will be processed " +
        'by a powerful full-text search engine.\n\n' +
        'Key Syntax Features (see https://www.sqlite.org/fts5.html for full documentation):\n' +
        '  - AND (default): Space-separated terms are combined with AND.\n' +
        '    - Example: \'standalone component\' (finds results with both "standalone" and "component")\n' +
        '  - OR: Use the OR operator to find results with either term.\n' +
        "    - Example: 'validation OR validator'\n" +
        '  - NOT: Use the NOT operator to exclude terms.\n' +
        "    - Example: 'forms NOT reactive'\n" +
        '  - Grouping: Use parentheses () to group expressions.\n' +
        "    - Example: '(validation OR validator) AND forms'\n" +
        '  - Phrase Search: Use double quotes "" for exact phrases.\n' +
        '    - Example: \'"template-driven forms"\'\n' +
        '  - Prefix Search: Use an asterisk * for prefix matching.\n' +
        '    - Example: \'rout*\' (matches "route", "router", "routing")',
    ),
  keywords: z
    .array(z.string())
    .optional()
    .describe(
      'A list of specific, exact keywords to narrow the search. Use this for precise terms like ',
    ),
  required_packages: z
    .array(z.string())
    .optional()
    .describe(
      "A list of NPM packages that an example must use. Use this when the user's request is " +
        'specific to a feature within a certain package (e.g., if the user asks about `ngModel`, ' +
        'you should filter by `@angular/forms`).',
    ),
  related_concepts: z
    .array(z.string())
    .optional()
    .describe(
      'A list of high-level concepts to filter by. Use this to find examples related to broader ' +
        'architectural ideas or patterns (e.g., `signals`, `dependency injection`, `routing`).',
    ),
  includeExperimental: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'By default, this tool returns only production-safe examples. Set this to `true` **only if** ' +
        'the user explicitly asks for a bleeding-edge feature or if a stable solution to their ' +
        'problem cannot be found. If you set this to `true`, you **MUST** preface your answer by ' +
        'warning the user that the example uses experimental APIs that are not suitable for production.',
    ),
});

export type FindExampleInput = z.infer<typeof findExampleInputSchema>;

export const findExampleOutputSchema = z.object({
  examples: z.array(
    z.object({
      title: z
        .string()
        .describe(
          'The title of the example. Use this as a heading when presenting the example to the user.',
        ),
      summary: z
        .string()
        .describe(
          "A one-sentence summary of the example's purpose. Use this to help the user decide " +
            'if the example is relevant to them.',
        ),
      keywords: z
        .array(z.string())
        .optional()
        .describe(
          'A list of keywords for the example. You can use these to explain why this example ' +
            "was a good match for the user's query.",
        ),
      required_packages: z
        .array(z.string())
        .optional()
        .describe(
          'A list of NPM packages required for the example to work. Before presenting the code, ' +
            'you should inform the user if any of these packages need to be installed.',
        ),
      related_concepts: z
        .array(z.string())
        .optional()
        .describe(
          'A list of related concepts. You can suggest these to the user as topics for ' +
            'follow-up questions.',
        ),
      related_tools: z
        .array(z.string())
        .optional()
        .describe(
          'A list of related MCP tools. You can suggest these as potential next steps for the user.',
        ),
      content: z
        .string()
        .describe(
          'A complete, self-contained Angular code example in Markdown format. This should be ' +
            'presented to the user inside a markdown code block.',
        ),
      snippet: z
        .string()
        .optional()
        .describe(
          'A contextual snippet from the content showing the matched search term. This field is ' +
            'critical for efficiently evaluating a result`s relevance. It enables two primary ',
        ),
    }),
  ),
});
