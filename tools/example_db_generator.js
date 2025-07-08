/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

const { readdirSync, readFileSync, mkdirSync, existsSync, rmSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function generate(inPath, outPath) {
  const examples = [];

  const entries = readdirSync(resolve(inPath), { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    examples.push(readFileSync(resolve(inPath, entry.name), 'utf-8'));
  }

  const dbPath = outPath;
  mkdirSync(dirname(outPath), { recursive: true });

  if (existsSync(dbPath)) {
    rmSync(dbPath);
  }
  const db = new DatabaseSync(dbPath);

  db.exec(`CREATE VIRTUAL TABLE examples USING fts5(content, tokenize = 'porter ascii');`);

  const insertStatement = db.prepare('INSERT INTO examples(content) VALUES(?);');

  db.exec('BEGIN TRANSACTION');
  for (const example of examples) {
    insertStatement.run(example);
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
