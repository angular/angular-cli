/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { glob, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { z } from 'zod';
import { McpToolContext, declareTool } from './tool-registry';

const findExampleInputSchema = z.object({
  query: z
    .string()
    .describe(
      `The primary, conceptual search query. This should capture the user's main goal or question ` +
        `(e.g., 'lazy loading a route' or 'how to use signal inputs'). The query will be processed ` +
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
      'A list of specific, exact keywords to narrow the search. Use this for precise terms like ' +
        'API names, function names, or decorators (e.g., `ngFor`, `trackBy`, `inject`).',
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

type FindExampleInput = z.infer<typeof findExampleInputSchema>;

const findExampleOutputSchema = z.object({
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
            'critical for efficiently evaluating a result`s relevance. It enables two primary ' +
            'workflows:\n\n' +
            '1. For direct questions: You can internally review snippets to select the single best ' +
            'result before generating a comprehensive answer from its full `content`.\n' +
            '2. For ambiguous or exploratory questions: You can present a summary of titles and ' +
            'snippets to the user, allowing them to guide the next step.',
        ),
    }),
  ),
});

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
  outputSchema: findExampleOutputSchema.shape,
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
  let db: DatabaseSync | undefined;

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

    const { query, keywords, required_packages, related_concepts, includeExperimental } = input;

    // Build the query dynamically
    const params: SQLInputValue[] = [];
    let sql =
      'SELECT title, summary, keywords, required_packages, related_concepts, related_tools, content, ' +
      // The `snippet` function generates a contextual snippet of the matched text.
      // Column 6 is the `content` column. We highlight matches with asterisks and limit the snippet size.
      "snippet(examples_fts, 6, '**', '**', '...', 15) AS snippet " +
      'FROM examples_fts';
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

    if (!includeExperimental) {
      whereClauses.push('experimental = 0');
    }

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
      const record = exampleRecord as Record<string, string>;
      const example = {
        title: record['title'],
        summary: record['summary'],
        keywords: JSON.parse(record['keywords'] || '[]') as string[],
        required_packages: JSON.parse(record['required_packages'] || '[]') as string[],
        related_concepts: JSON.parse(record['related_concepts'] || '[]') as string[],
        related_tools: JSON.parse(record['related_tools'] || '[]') as string[],
        content: record['content'],
        snippet: record['snippet'],
      };
      examples.push(example);

      // Also create a more structured text output
      let text = `## Example: ${example.title}\n**Summary:** ${example.summary}`;
      if (example.snippet) {
        text += `\n**Snippet:** ${example.snippet}`;
      }
      text += `\n\n---\n\n${example.content}`;
      textContent.push({ type: 'text' as const, text });
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
        const trimmedValue = value.trim();
        if (trimmedValue === 'true') {
          data[currentKey] = true;
        } else if (trimmedValue === 'false') {
          data[currentKey] = false;
        } else {
          data[currentKey] = trimmedValue;
        }
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

async function setupRuntimeExamples(examplesPath: string): Promise<DatabaseSync> {
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
      experimental INTEGER NOT NULL DEFAULT 0,
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
      'title, summary, keywords, required_packages, related_concepts, related_tools, experimental, content' +
      ') VALUES(?, ?, ?, ?, ?, ?, ?, ?);',
  );

  const frontmatterSchema = z.object({
    title: z.string(),
    summary: z.string(),
    keywords: z.array(z.string()).optional(),
    required_packages: z.array(z.string()).optional(),
    related_concepts: z.array(z.string()).optional(),
    related_tools: z.array(z.string()).optional(),
    experimental: z.boolean().optional(),
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

    const {
      title,
      summary,
      keywords,
      required_packages,
      related_concepts,
      related_tools,
      experimental,
    } = validation.data;

    insertStatement.run(
      title,
      summary,
      JSON.stringify(keywords ?? []),
      JSON.stringify(required_packages ?? []),
      JSON.stringify(related_concepts ?? []),
      JSON.stringify(related_tools ?? []),
      experimental ? 1 : 0,
      content,
    );
  }
  db.exec('END TRANSACTION');

  return db;
}
