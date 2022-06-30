/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

const { readFileSync, writeFileSync, mkdirSync } = require('fs');
const { resolve, dirname } = require('path');
const schemaRefParser = require('@apidevtools/json-schema-ref-parser');

/**
 * Generator the Angular CLI workspace schema file.
 */

async function generate(inPath, outPath) {
  // While on paper we could use quicktype for this.
  // Quicktype doesn't handle `patternProperties` and `oneOf` that well.
  const jsonSchema = readFileSync(inPath, 'utf8');
  const buildWorkspaceDirectory = process.env['BUILD_WORKSPACE_DIRECTORY'] || '.';
  outPath = resolve(buildWorkspaceDirectory, outPath);
  const schema = await schemaRefParser.bundle(inPath, JSON.parse(jsonSchema));

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    JSON.stringify(
      schema,
      (key, value) => {
        if (key === 'x-user-analytics' || key === 'x-prompt') {
          // Not needed for the CLI schema
          return undefined;
        }

        if (key === 'x-deprecated') {
          // Will be replaced to 'deprecated' later on. This must be a boolean.
          // https://json-schema.org/draft/2020-12/json-schema-validation.html#name-deprecated
          return !!value;
        }

        return value;
      },
      2,
    ).replace(/"x-deprecated"/g, '"deprecated"'),
  );
}

if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2);
    if (argv.length !== 2) {
      console.error('Must include 2 arguments.');
      process.exit(1);
    }

    const [inPath, outPath] = argv;

    try {
      await generate(inPath, outPath);
    } catch (error) {
      console.error('An error happened:');
      console.error(error);
      process.exit(127);
    }
  })();
}

exports.generate = generate;
