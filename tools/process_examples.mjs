#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { marked } from 'marked';
import { execSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { z } from 'zod';

const HARNESS_PATH = resolve(import.meta.dirname, 'example-validation-harness');
const REQUIRED_HEADINGS = ['Purpose', 'When to Use', 'Key Concepts', 'Example Files'];

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

/**
 * Parses a markdown example file into a structured object.
 * This function performs a single pass over the markdown tokens to extract
 * front matter, validate the heading structure, and associate code blocks
 * with their preceding filenames.
 *
 * @param {string} filePath The absolute path to the markdown file.
 * @returns {object} A structured representation of the example.
 */
function parseExampleFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const tokens = marked.lexer(content);

  const frontmatter = parseFrontmatter(content);
  if (Object.keys(frontmatter).length === 0) {
    throw new Error(`Validation failed for ${basename(filePath)}: Missing front matter.`);
  }

  const sections = [];
  let currentSection = null;
  let currentFilename = null;

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 2) {
      currentSection = {
        title: token.text,
        content: '',
        codeBlocks: [],
      };
      sections.push(currentSection);
    } else if (currentSection) {
      if (token.type === 'heading' && token.depth === 3) {
        currentFilename = token.text.replace(/^["'`]|["'`]$/g, '');
      } else if (token.type === 'code' && currentFilename) {
        currentSection.codeBlocks.push({
          filename: currentFilename,
          lang: token.lang,
          code: token.text,
        });
        currentFilename = null; // Reset after consumption
      }
      currentSection.content += token.raw;
    }
  }

  // Validate the structure after parsing.
  const headings = sections.map((s) => s.title);
  let lastIndex = -1;
  for (const requiredHeading of REQUIRED_HEADINGS) {
    const currentIndex = headings.indexOf(requiredHeading);
    if (currentIndex === -1) {
      throw new Error(
        `Validation failed for ${basename(filePath)}: Missing required heading '## ${requiredHeading}'.\n` +
          `Please refer to docs/FIND_EXAMPLES_FORMAT.md for the correct structure.`,
      );
    }
    if (currentIndex < lastIndex) {
      throw new Error(
        `Validation failed for ${basename(filePath)}: Heading '## ${requiredHeading}' is out of order.\n` +
          `Please refer to docs/FIND_EXAMPLES_FORMAT.md for the correct structure.`,
      );
    }
    lastIndex = currentIndex;
  }

  return {
    sourcePath: filePath,
    frontmatter,
    sections,
  };
}

// --- Mode Implementations ---

function runValidateStructure(examplesPath) {
  console.log('Validating markdown structure of all example files...');
  const exampleFiles = globSync('**/*.md', { cwd: examplesPath });
  for (const file of exampleFiles) {
    parseExampleFile(join(examplesPath, file));
  }
  console.log(`Successfully validated structure of ${exampleFiles.length} files.`);
}

function runGenerateDb(examplesPath, outputPath) {
  if (!outputPath) {
    throw new Error('Missing required argument: --output=<path>');
  }
  console.log(`Generating example database at ${outputPath}...`);
  const dbFiles = globSync('**/*.md', { cwd: examplesPath });
  const parsedExamplesForDb = dbFiles.map((f) => parseExampleFile(join(examplesPath, f)));

  const dbPath = resolve(outputPath);
  mkdirSync(dirname(dbPath), { recursive: true });
  if (existsSync(dbPath)) {
    rmSync(dbPath);
  }
  const db = new DatabaseSync(dbPath);

  // Create tables and triggers
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
  db.exec(`
    CREATE VIRTUAL TABLE examples_fts USING fts5(
      title, summary, keywords, required_packages, related_concepts, related_tools, content,
      content='examples', content_rowid='id', tokenize = 'porter ascii'
    );
  `);
  db.exec(`
    CREATE TRIGGER examples_after_insert AFTER INSERT ON examples BEGIN
      INSERT INTO examples_fts(
        rowid, title, summary, keywords, required_packages, related_concepts, related_tools, content
      ) VALUES (
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
  for (const example of parsedExamplesForDb) {
    const validation = frontmatterSchema.safeParse(example.frontmatter);
    if (!validation.success) {
      throw new Error(`Invalid front matter in ${example.sourcePath}: ${validation.error.issues}`);
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
      readFileSync(example.sourcePath, 'utf-8'),
    );
  }
  db.exec('END TRANSACTION');
  db.close();
  console.log(`Successfully generated database with ${parsedExamplesForDb.length} examples.`);
}

function runValidateCode(examplesPath) {
  console.log('Setting up validation harness...');
  const tempDir = mkdtempSync(join(tmpdir(), 'angular-cli-example-validation-'));
  console.log(`Harness directory: ${tempDir}`);

  try {
    cpSync(HARNESS_PATH, tempDir, { recursive: true });
    execSync('pnpm install', { cwd: tempDir, stdio: 'inherit' });
    console.log('Harness setup complete.');

    console.log('Parsing and validating example files...');
    const codeFiles = globSync('**/*.md', { cwd: examplesPath });
    const parsedExamplesForCode = codeFiles.map((f) => parseExampleFile(join(examplesPath, f)));
    console.log(`Successfully parsed ${parsedExamplesForCode.length} example files.`);

    console.log('Populating harness with example code...');
    const appDir = join(tempDir, 'src', 'app');
    const mainTsDir = join(tempDir, 'src');
    const allBootstrapFiles = [];

    for (const [index, example] of parsedExamplesForCode.entries()) {
      const exampleDirName = `example-${index}-${basename(example.sourcePath, '.md')}`;
      const exampleDir = join(appDir, exampleDirName);
      mkdirSync(exampleDir);

      const exampleFilesSection = example.sections.find((s) => s.title === 'Example Files');
      if (!exampleFilesSection) {
        continue;
      }

      const componentClassNames = [];
      const componentImports = [];

      for (const block of exampleFilesSection.codeBlocks) {
        const match = block.code.match(/export\s+class\s+([A-Za-z0-9_]+)/);
        if (match) {
          const className = match[1];
          componentClassNames.push(className);
          const importPath = `./app/${exampleDirName}/${basename(block.filename, '.ts')}`;
          componentImports.push(`import { ${className} } from '${importPath}';`);
        }
        writeFileSync(join(exampleDir, block.filename), block.code);
      }

      // Create a unique main.ts file for each example to create an isolated compilation unit.
      if (componentClassNames.length > 0) {
        const mainTsContent = `
          import { bootstrapApplication } from '@angular/platform-browser';
          ${componentImports.join('\n')}

          // Bootstrap the first component found in the example.
          bootstrapApplication(${componentClassNames[0]}).catch(err => console.error(err));
        `;
        const bootstrapFilename = `main.${index}.ts`;
        writeFileSync(join(mainTsDir, bootstrapFilename), mainTsContent);
        allBootstrapFiles.push(bootstrapFilename);
      }
    }
    console.log('Harness population complete.');

    // Update tsconfig to include all generated main files, effectively creating a multi-entry-point compilation.
    const tsconfigPath = join(tempDir, 'tsconfig.app.json');
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    // We remove the original main.ts and replace it with our generated files.
    tsconfig.files = allBootstrapFiles.map((f) => `src/${f}`);
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    console.log('Updated tsconfig.app.json with all example entry points.');

    console.log('Running Angular build...');
    execSync('npx ng build', { cwd: tempDir, stdio: 'inherit' });
    console.log('Build successful!');
  } finally {
    console.log('Cleaning up temporary directory...');
    rmSync(tempDir, { recursive: true, force: true });
    console.log('Cleanup complete.');
  }
}

// --- Main Entry Point ---
function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      mode: {
        type: 'string',
        default: 'generate-db',
      },
      output: {
        type: 'string',
      },
    },
  });
  const examplesPath = positionals[0] ?? '.';
  const mode = values.mode;

  console.log(`Running example processor in '${mode}' mode.`);

  try {
    switch (mode) {
      case 'validate-structure':
        runValidateStructure(examplesPath);
        break;
      case 'validate-code':
        runValidateCode(examplesPath);
        break;
      case 'generate-db':
        runGenerateDb(examplesPath, values.output);
        break;
      default:
        throw new Error(
          `Unknown mode: ${mode}. Available modes are: validate-structure, validate-code, generate-db.`,
        );
    }
    console.log(`Successfully completed '${mode}' mode.`);
  } catch (error) {
    console.error(`\nERROR: Example processing failed in '${mode}' mode.`);
    console.error(error.message);
    process.exit(1);
  }
}

main();
