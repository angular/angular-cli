/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { glob, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { SQLInputValue } from 'node:sqlite';
import { z } from 'zod';
import { McpToolContext, declareTool } from './tool-registry';

const findExampleInputSchema = z.object({
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
  keywords: z.array(z.string()).optional().describe('Filter examples by specific keywords.'),
  required_packages: z
    .array(z.string())
    .optional()
    .describe('Filter examples by required NPM packages (e.g., "@angular/forms").'),
  related_concepts: z
    .array(z.string())
    .optional()
    .describe('Filter examples by related high-level concepts.'),
});
type FindExampleInput = z.infer<typeof findExampleInputSchema>;

export const FIND_EXAMPLE_TOOL = declareTool({
  name: 'find_examples',
  title: 'Find Angular Code Examples',
  description: `
<Purpose>
Augments your knowledge base with a curated database of official, best-practice code examples,
focusing on **modern, new, and recently updated** Angular features. This tool acts as a RAG
(Retrieval-Augmented Generation) source, providing ground-truth information on the latest Angular
APIs and patterns. You **MUST** use it to understand and apply current standards when working with
new or evolving features.
</Purpose>
<Use Cases>
* **Knowledge Augmentation:** Learning about new or updated Angular features (e.g., query: 'signal input' or 'deferrable views').
* **Modern Implementation:** Finding the correct modern syntax for features
  (e.g., query: 'functional route guard' or 'http client with fetch').
* **Refactoring to Modern Patterns:** Upgrading older code by finding examples of new syntax
  (e.g., query: 'built-in control flow' to replace "*ngIf").
* **Advanced Filtering:** Combining a full-text search with filters to narrow results.
  (e.g., query: 'forms', required_packages: ['@angular/forms'], keywords: ['validation'])
</Use Cases>
<Operational Notes>
* **Tool Selection:** This database primarily contains examples for new and recently updated Angular
  features. For established, core features, the main documentation (via the
  \`search_documentation\` tool) may be a better source of information.
* The examples in this database are the single source of truth for modern Angular coding patterns.
* The search query uses a powerful full-text search syntax (FTS5). Refer to the 'query'
  parameter description for detailed syntax rules and examples.
* You can combine the main 'query' with optional filters like 'keywords', 'required_packages',
  and 'related_concepts' to create highly specific searches.
</Operational Notes>`,
  inputSchema: findExampleInputSchema.shape,
  outputSchema: {
    examples: z.array(
      z.object({
        content: z
          .string()
          .describe('A complete, self-contained Angular code example in Markdown format.'),
      }),
    ),
  },
  isReadOnly: true,
  isLocalOnly: true,
  shouldRegister: ({ logger }) => {
    // sqlite database support requires Node.js 22.16+
    const [nodeMajor, nodeMinor] = process.versions.node.split('.', 2).map(Number);
    if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 16)) {
      logger.warn(
        `MCP tool 'find_examples' requires Node.js 22.16 (or higher). ` +
          ' Registration of this tool has been skipped.',
      );

      return false;
    }

    return true;
  },
  factory: createFindExampleHandler,
});

async function createFindExampleHandler({ exampleDatabasePath }: McpToolContext) {
  let db: import('node:sqlite').DatabaseSync | undefined;
  let queryStatement: import('node:sqlite').StatementSync | undefined;

  if (process.env['NG_MCP_EXAMPLES_DIR']) {
    db = await setupRuntimeExamples(process.env['NG_MCP_EXAMPLES_DIR']);
  }

  suppressSqliteWarning();

  return async (input: FindExampleInput) => {
    if (!db) {
      if (!exampleDatabasePath) {
        // This should be prevented by the registration logic in mcp-server.ts
        throw new Error('Example database path is not available.');
      }
      const { DatabaseSync } = await import('node:sqlite');
      db = new DatabaseSync(exampleDatabasePath, { readOnly: true });
    }

    const { query, keywords, required_packages, related_concepts } = input;

    // Build the query dynamically
    const params: SQLInputValue[] = [];
    let sql = 'SELECT content FROM examples_fts';
    const whereClauses = [];

    // FTS query
    if (query) {
      whereClauses.push('examples_fts MATCH ?');
      params.push(escapeSearchQuery(query));
    }

    // JSON array filters
    const addJsonFilter = (column: string, values: string[] | undefined) => {
      if (values?.length) {
        for (const value of values) {
          whereClauses.push(`${column} LIKE ?`);
          params.push(`%"${value}"%`);
        }
      }
    };

    addJsonFilter('keywords', keywords);
    addJsonFilter('required_packages', required_packages);
    addJsonFilter('related_concepts', related_concepts);

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Order the results by relevance using the BM25 algorithm.
    // The weights assigned to each column boost the ranking of documents where the
    // search term appears in a more important field.
    // Column order: title, summary, keywords, required_packages, related_concepts, related_tools, content
    sql += ' ORDER BY bm25(examples_fts, 10.0, 5.0, 5.0, 1.0, 2.0, 1.0, 1.0);';

    const queryStatement = db.prepare(sql);

    // Query database and return results
    const examples = [];
    const textContent = [];
    for (const exampleRecord of queryStatement.all(...params)) {
      const exampleContent = exampleRecord['content'] as string;
      examples.push({ content: exampleContent });
      textContent.push({ type: 'text' as const, text: exampleContent });
    }

    return {
      content: textContent,
      structuredContent: { examples },
    };
  };
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

/**
 * A simple YAML front matter parser.
 *
 * This function extracts the YAML block enclosed by `---` at the beginning of a string
 * and parses it into a JavaScript object. It is not a full YAML parser and only
 * supports simple key-value pairs and string arrays.
 *
 * @param content The string content to parse.
 * @returns A record containing the parsed front matter data.
 */
function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\r?\n(.*?)\r?\n---/s);
  if (!match) {
    return {};
  }

  const frontmatter = match[1];
  const data: Record<string, unknown> = {};
  const lines = frontmatter.split(/\r?\n/);

  let currentKey = '';
  let isArray = false;
  const arrayValues: string[] = [];

  for (const line of lines) {
    const keyValueMatch = line.match(/^([^:]+):\s*(.*)/);
    if (keyValueMatch) {
      if (currentKey && isArray) {
        data[currentKey] = arrayValues.slice();
        arrayValues.length = 0;
      }

      const [, key, value] = keyValueMatch;
      currentKey = key.trim();
      isArray = value.trim() === '';

      if (!isArray) {
        data[currentKey] = value.trim();
      }
    } else {
      const arrayItemMatch = line.match(/^\s*-\s*(.*)/);
      if (arrayItemMatch && currentKey && isArray) {
        arrayValues.push(arrayItemMatch[1].trim());
      }
    }
  }

  if (currentKey && isArray) {
    data[currentKey] = arrayValues;
  }

  return data;
}

async function setupRuntimeExamples(
  examplesPath: string,
): Promise<import('node:sqlite').DatabaseSync> {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:');

  // Create a relational table to store the structured example data.
  db.exec(`
    CREATE TABLE examples (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      keywords TEXT,
      required_packages TEXT,
      related_concepts TEXT,
      related_tools TEXT,
      content TEXT NOT NULL
    );
  `);

  // Create an FTS5 virtual table to provide full-text search capabilities.
  db.exec(`
    CREATE VIRTUAL TABLE examples_fts USING fts5(
      title,
      summary,
      keywords,
      required_packages,
      related_concepts,
      related_tools,
      content,
      content='examples',
      content_rowid='id',
      tokenize = 'porter ascii'
    );
  `);

  // Create triggers to keep the FTS table synchronized with the examples table.
  db.exec(`
    CREATE TRIGGER examples_after_insert AFTER INSERT ON examples BEGIN
      INSERT INTO examples_fts(rowid, title, summary, keywords, required_packages, related_concepts, related_tools, content)
      VALUES (
        new.id, new.title, new.summary, new.keywords, new.required_packages, new.related_concepts,
        new.related_tools, new.content
      );
    END;
  `);

  const insertStatement = db.prepare(
    'INSERT INTO examples(' +
      'title, summary, keywords, required_packages, related_concepts, related_tools, content' +
      ') VALUES(?, ?, ?, ?, ?, ?, ?);',
  );

  const frontmatterSchema = z.object({
    title: z.string(),
    summary: z.string(),
    keywords: z.array(z.string()).optional(),
    required_packages: z.array(z.string()).optional(),
    related_concepts: z.array(z.string()).optional(),
    related_tools: z.array(z.string()).optional(),
  });

  db.exec('BEGIN TRANSACTION');
  for await (const entry of glob('**/*.md', { cwd: examplesPath, withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    const content = await readFile(path.join(entry.parentPath, entry.name), 'utf-8');
    const frontmatter = parseFrontmatter(content);

    const validation = frontmatterSchema.safeParse(frontmatter);
    if (!validation.success) {
      // eslint-disable-next-line no-console
      console.warn(`Skipping invalid example file ${entry.name}:`, validation.error.issues);
      continue;
    }

    const { title, summary, keywords, required_packages, related_concepts, related_tools } =
      validation.data;

    insertStatement.run(
      title,
      summary,
      JSON.stringify(keywords ?? []),
      JSON.stringify(required_packages ?? []),
      JSON.stringify(related_concepts ?? []),
      JSON.stringify(related_tools ?? []),
      content,
    );
  }
  db.exec('END TRANSACTION');

  return db;
}
