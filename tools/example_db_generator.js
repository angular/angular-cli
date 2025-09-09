/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

const { globSync, readdirSync, readFileSync, mkdirSync, existsSync, rmSync } = require('node:fs');
const { resolve, dirname, join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { z } = require('zod');

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
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n(.*?)\r?\n---/s);
  if (!match) {
    return {};
  }

  const frontmatter = match[1];
  const data = {};
  const lines = frontmatter.split(/\r?\n/);

  let currentKey = '';
  let isArray = false;
  const arrayValues = [];

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

function generate(inPath, outPath) {
  const dbPath = outPath;
  mkdirSync(dirname(outPath), { recursive: true });

  if (existsSync(dbPath)) {
    rmSync(dbPath);
  }
  const db = new DatabaseSync(dbPath);

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
      INSERT INTO examples_fts(
        rowid, title, summary, keywords, required_packages, related_concepts, related_tools,
        content
      )
      VALUES (
        new.id, new.title, new.summary, new.keywords, new.required_packages,
        new.related_concepts, new.related_tools, new.content
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
  const entries = globSync
    ? globSync('**/*.md', { cwd: resolve(inPath), withFileTypes: true })
    : readdirSync(resolve(inPath), { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    const content = readFileSync(join(entry.parentPath, entry.name), 'utf-8');
    const frontmatter = parseFrontmatter(content);

    const validation = frontmatterSchema.safeParse(frontmatter);
    if (!validation.success) {
      console.error(`Validation failed for example file: ${entry.name}`);
      console.error('Issues:', validation.error.issues);
      throw new Error(`Invalid front matter in ${entry.name}`);
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

  db.close();
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length !== 2) {
    console.error('Must include 2 arguments.');
    process.exit(1);
  }

  const [inPath, outPath] = argv;

  try {
    generate(inPath, outPath);
  } catch (error) {
    console.error('An error happened:');
    console.error(error);
    process.exit(127);
  }
}

exports.generate = generate;
