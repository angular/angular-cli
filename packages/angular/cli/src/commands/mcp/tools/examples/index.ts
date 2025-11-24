/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { DatabaseSync } from 'node:sqlite';
import { type McpToolContext, declareTool } from '../tool-registry';
import { queryDatabase, validateDatabaseSchema } from './database';
import { getVersionSpecificExampleDatabases } from './database-discovery';
import { setupRuntimeExamples } from './runtime-database';
import { type FindExampleInput, findExampleInputSchema, findExampleOutputSchema } from './schemas';
import { suppressSqliteWarning } from './utils';

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
* **Project-Specific Use (Recommended):** For tasks inside a user's project, you **MUST** provide the
  \`workspacePath\` argument to get examples that match the project's Angular version. Get this
  path from \`list_projects\`.
* **General Use:** If no project context is available (e.g., for general questions or learning),
  you can call the tool without the \`workspacePath\` argument. It will return the latest
  generic examples.
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

async function createFindExampleHandler({ logger, exampleDatabasePath, host }: McpToolContext) {
  const runtimeDb = process.env['NG_MCP_EXAMPLES_DIR']
    ? await setupRuntimeExamples(process.env['NG_MCP_EXAMPLES_DIR'], host)
    : undefined;

  suppressSqliteWarning();

  return async (input: FindExampleInput) => {
    // If the dev-time override is present, use it and bypass all other logic.
    if (runtimeDb) {
      return queryDatabase([runtimeDb], input);
    }

    const resolvedDbs: { path: string; source: string }[] = [];

    // First, try to get all available version-specific guides.
    if (input.workspacePath) {
      const versionSpecificDbs = await getVersionSpecificExampleDatabases(
        input.workspacePath,
        logger,
        host,
      );
      for (const db of versionSpecificDbs) {
        resolvedDbs.push({ path: db.dbPath, source: db.source });
      }
    }

    // If no version-specific guides were found for any reason, fall back to the bundled version.
    if (resolvedDbs.length === 0 && exampleDatabasePath) {
      resolvedDbs.push({ path: exampleDatabasePath, source: 'bundled' });
    }

    if (resolvedDbs.length === 0) {
      // This should be prevented by the registration logic in mcp-server.ts
      throw new Error('No example databases are available.');
    }

    const { DatabaseSync } = await import('node:sqlite');
    const dbConnections: DatabaseSync[] = [];

    for (const { path, source } of resolvedDbs) {
      const db = new DatabaseSync(path, { readOnly: true });
      try {
        validateDatabaseSchema(db, source);
        dbConnections.push(db);
      } catch (e) {
        logger.warn((e as Error).message);
        // If a database is invalid, we should not query it, but we should not fail the whole tool.
        // We will just skip this database and try to use the others.
        continue;
      }
    }

    if (dbConnections.length === 0) {
      throw new Error('All available example databases were invalid. Cannot perform query.');
    }

    return queryDatabase(dbConnections, input);
  };
}
