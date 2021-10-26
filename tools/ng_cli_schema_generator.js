/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

const { readFileSync, writeFileSync, mkdirSync } = require('fs');
const { resolve, dirname } = require('path');

/**
 * Generator the Angular CLI workspace schema file.
 */
function generate(inPath, outPath) {
  // While on paper we could use quicktype for this.
  // Quicktype doesn't handle `patternProperties` and `oneOf` that well.

  const jsonSchema = readFileSync(inPath, 'utf8');
  const nestedDefinitions = {};
  const schemaParsed = JSON.parse(jsonSchema, (key, value) => {
    if (key === '$ref' && typeof value === 'string' && !value.startsWith('#')) {
      // Resolve $ref and camelize key
      const definitionKey = value
        .replace(/(\.json|src)/g, '')
        .split(/\\|\/|_|-|\./)
        .filter((p) => !!p)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');

      const nestedSchemaPath = resolve(dirname(inPath), value);
      const nestedSchema = readFileSync(nestedSchemaPath, 'utf8');
      const nestedSchemaJson = JSON.parse(nestedSchema, (key, value) => {
        switch (key) {
          case '$ref':
            if (value.startsWith('#/definitions/')) {
              return value.replace('#/definitions/', `#/definitions/${definitionKey}/definitions/`);
            } else {
              throw new Error(`Error while resolving $ref ${value} in ${nestedSchemaPath}.`);
            }
          case '$id':
          case '$id':
          case '$schema':
          case 'id':
          case 'required':
            return undefined;
          default:
            return value;
        }
      });

      nestedDefinitions[definitionKey] = nestedSchemaJson;

      return `#/definitions/${definitionKey}`;
    }

    return key === ''
      ? {
          ...value,
          definitions: {
            ...value.definitions,
            ...nestedDefinitions,
          },
        }
      : value;
  });

  const buildWorkspaceDirectory = process.env['BUILD_WORKSPACE_DIRECTORY'] || '.';
  outPath = resolve(buildWorkspaceDirectory, outPath);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(schemaParsed, undefined, 2));
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
