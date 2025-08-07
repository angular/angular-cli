/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { glob, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

/**
 * Registers the `find_examples` tool with the MCP server.
 *
 * This tool allows users to search for best-practice Angular code examples
 * from a local SQLite database.
 *
 * @param server The MCP server instance.
 * @param exampleDatabasePath The path to the SQLite database file containing the examples.
 */
export async function registerFindExampleTool(
  server: McpServer,
  exampleDatabasePath: string,
): Promise<void> {
  let db: import('node:sqlite').DatabaseSync | undefined;
  let queryStatement: import('node:sqlite').StatementSync | undefined;

  // Runtime directory of examples uses an in-memory database
  if (process.env['NG_MCP_EXAMPLES_DIR']) {
    db = await setupRuntimeExamples(process.env['NG_MCP_EXAMPLES_DIR']);
  }

  suppressSqliteWarning();

  server.registerTool(
    'find_examples',
    {
      title: 'Find Angular Code Examples',
      description:
        'Before writing or modifying any Angular code including templates, ' +
        '**ALWAYS** use this tool to find current best-practice examples. ' +
        'This is critical for ensuring code quality and adherence to modern Angular standards. ' +
        'This tool searches a curated database of approved Angular code examples and returns the most relevant results for your query. ' +
        'Example Use Cases: ' +
        "1) Creating new components, directives, or services (e.g., query: 'standalone component' or 'signal input'). " +
        "2) Implementing core features (e.g., query: 'lazy load route', 'httpinterceptor', or 'route guard'). " +
        "3) Refactoring existing code to use modern patterns (e.g., query: 'ngfor trackby' or 'form validation').",
      inputSchema: {
        query: z.string().describe(
          `Performs a full-text search using FTS5 syntax. The query should target relevant Angular concepts.

Key Syntax Features (see https://www.sqlite.org/fts5.html for full documentation):
  - AND (default): Space-separated terms are combined with AND.
    - Example: 'standalone component' (finds results with both "standalone" and "component")
  - OR: Use the OR operator to find results with either term.
    - Example: 'validation OR validator'
  - NOT: Use the NOT operator to exclude terms.
    - Example: 'forms NOT reactive'
  - Grouping: Use parentheses () to group expressions.
    - Example: '(validation OR validator) AND forms'
  - Phrase Search: Use double quotes "" for exact phrases.
    - Example: '"template-driven forms"'
  - Prefix Search: Use an asterisk * for prefix matching.
    - Example: 'rout*' (matches "route", "router", "routing")

Examples of queries:
  - Find standalone components: 'standalone component'
  - Find ngFor with trackBy: 'ngFor trackBy'
  - Find signal inputs: 'signal input'
  - Find lazy loading a route: 'lazy load route'
  - Find forms with validation: 'form AND (validation OR validator)'`,
        ),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ query }) => {
      if (!db) {
        const { DatabaseSync } = await import('node:sqlite');
        db = new DatabaseSync(exampleDatabasePath, { readOnly: true });
      }
      if (!queryStatement) {
        queryStatement = db.prepare('SELECT * from examples WHERE examples MATCH ? ORDER BY rank;');
      }

      const sanitizedQuery = escapeSearchQuery(query);

      // Query database and return results as text content
      const content = [];
      for (const exampleRecord of queryStatement.all(sanitizedQuery)) {
        content.push({ type: 'text' as const, text: exampleRecord['content'] as string });
      }

      return {
        content,
      };
    },
  );
}

/**
 * Escapes a search query for FTS5 by tokenizing and quoting terms.
 *
 * This function processes a raw search string and prepares it for an FTS5 full-text search.
 * It correctly handles quoted phrases, logical operators (AND, OR, NOT), parentheses,
 * and prefix searches (ending with an asterisk), ensuring that individual search
 * terms are properly quoted to be treated as literals by the search engine.
 * This is primarily intended to avoid unintentional usage of FTS5 query syntax by consumers.
 *
 * @param query The raw search query string.
 * @returns A sanitized query string suitable for FTS5.
 */
export function escapeSearchQuery(query: string): string {
  // This regex tokenizes the query string into parts:
  // 1. Quoted phrases (e.g., "foo bar")
  // 2. Parentheses ( and )
  // 3. FTS5 operators (AND, OR, NOT, NEAR)
  // 4. Words, which can include a trailing asterisk for prefix search (e.g., foo*)
  const tokenizer = /"([^"]*)"|([()])|\b(AND|OR|NOT|NEAR)\b|([^\s()]+)/g;
  let match;
  const result: string[] = [];
  let lastIndex = 0;

  while ((match = tokenizer.exec(query)) !== null) {
    // Add any whitespace or other characters between tokens
    if (match.index > lastIndex) {
      result.push(query.substring(lastIndex, match.index));
    }

    const [, quoted, parenthesis, operator, term] = match;

    if (quoted !== undefined) {
      // It's a quoted phrase, keep it as is.
      result.push(`"${quoted}"`);
    } else if (parenthesis) {
      // It's a parenthesis, keep it as is.
      result.push(parenthesis);
    } else if (operator) {
      // It's an operator, keep it as is.
      result.push(operator);
    } else if (term) {
      // It's a term that needs to be quoted.
      if (term.endsWith('*')) {
        result.push(`"${term.slice(0, -1)}"*`);
      } else {
        result.push(`"${term}"`);
      }
    }
    lastIndex = tokenizer.lastIndex;
  }

  // Add any remaining part of the string
  if (lastIndex < query.length) {
    result.push(query.substring(lastIndex));
  }

  return result.join('');
}

/**
 * Suppresses the experimental warning emitted by Node.js for the `node:sqlite` module.
 *
 * This is a workaround to prevent the console from being cluttered with warnings
 * about the experimental status of the SQLite module, which is used by this tool.
 */
function suppressSqliteWarning() {
  const originalProcessEmit = process.emit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.emit = function (event: string, error?: unknown): any {
    if (
      event === 'warning' &&
      error instanceof Error &&
      error.name === 'ExperimentalWarning' &&
      error.message.includes('SQLite')
    ) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-rest-params
    return originalProcessEmit.apply(process, arguments as any);
  };
}

async function setupRuntimeExamples(
  examplesPath: string,
): Promise<import('node:sqlite').DatabaseSync> {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:');

  db.exec(`CREATE VIRTUAL TABLE examples USING fts5(content, tokenize = 'porter ascii');`);

  const insertStatement = db.prepare('INSERT INTO examples(content) VALUES(?);');

  db.exec('BEGIN TRANSACTION');
  for await (const entry of glob('*.md', { cwd: examplesPath, withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    const example = await readFile(path.join(entry.parentPath, entry.name), 'utf-8');
    insertStatement.run(example);
  }
  db.exec('END TRANSACTION');

  return db;
}
