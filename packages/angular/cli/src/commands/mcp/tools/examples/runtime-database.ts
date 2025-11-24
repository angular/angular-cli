/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import type { McpToolContext } from '../tool-registry';

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
        let value = arrayItemMatch[1].trim();
        // Unquote if the value is quoted.
        if (
          (value.startsWith("'") && value.endsWith("'")) ||
          (value.startsWith('"') && value.endsWith('"'))
        ) {
          value = value.slice(1, -1);
        }
        arrayValues.push(value);
      }
    }
  }

  if (currentKey && isArray) {
    data[currentKey] = arrayValues;
  }

  return data;
}

export async function setupRuntimeExamples(
  examplesPath: string,
  host: McpToolContext['host'],
): Promise<DatabaseSync> {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:');

  // Create a relational table to store the structured example data.
  db.exec(`
    CREATE TABLE metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  db.exec(`
    INSERT INTO metadata (key, value) VALUES
      ('schema_version', '1'),
      ('created_at', '${new Date().toISOString()}');
  `);

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
  for await (const entry of host.glob('**/*.md', { cwd: examplesPath })) {
    if (!entry.isFile()) {
      continue;
    }

    const content = await host.readFile(join(entry.parentPath, entry.name), 'utf-8');
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
