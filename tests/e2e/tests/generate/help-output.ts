import assert from 'node:assert/strict';
import { join } from 'node:path';
import { createDir, writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default function () {
  // setup temp collection
  const genRoot = join('node_modules/fake-schematics/');

  return (
    Promise.resolve()
      .then(() => createDir(genRoot))
      .then(() =>
        writeMultipleFiles({
          [join(genRoot, 'package.json')]: `
      {
        "schematics": "./collection.json"
      }`,
          [join(genRoot, 'collection.json')]: `
      {
        "schematics": {
          "fake": {
            "factory": "./fake",
            "description": "Fake schematic",
            "schema": "./fake-schema.json"
          },
        }
      }`,
          [join(genRoot, 'fake-schema.json')]: `
      {
        "$id": "FakeSchema",
        "title": "Fake Schema",
        "type": "object",
        "required": ["a"],
        "properties": {
          "b": {
            "type": "string",
            "description": "b.",
            "$default": {
              "$source": "argv",
              "index": 1
            }
          },
          "a": {
            "type": "string",
            "description": "a.",
            "$default": {
              "$source": "argv",
              "index": 0
            }
          },
          "optC": {
            "type": "string",
            "description": "optC"
          },
          "optA": {
            "type": "string",
            "description": "optA"
          },
          "optB": {
            "type": "string",
            "description": "optB"
          }
        }
      }`,
          [join(genRoot, 'fake.js')]: `
      function def(options) {
        return (host, context) => {
          return host;
        };
      }
      exports.default = def;
      `,
        }),
      )
      .then(() => ng('generate', 'fake-schematics:fake', '--help'))
      .then(({ stdout }) => {
        assert.match(stdout, /ng generate fake-schematics:fake <a> \[b\]/);
        assert.match(stdout, /opt-a[\s\S]*opt-b[\s\S]*opt-c/);
      })
      // set up default collection.
      .then(() =>
        updateJsonFile('angular.json', (json) => {
          json.cli = json.cli || ({} as any);
          json.cli.schematicCollections = ['fake-schematics'];
        }),
      )
      .then(() => ng('generate', 'fake', '--help'))
      // verify same output
      .then(({ stdout }) => {
        assert.match(stdout, /ng generate fake <a> \[b\]/);
        assert.match(stdout, /opt-a[\s\S]*opt-b[\s\S]*opt-c/);
      })

      // should print all the available schematics in a collection
      // when a collection has more than 1 schematic
      .then(() =>
        writeMultipleFiles({
          [join(genRoot, 'collection.json')]: `
      {
        "schematics": {
          "fake": {
            "factory": "./fake",
            "description": "Fake schematic",
            "schema": "./fake-schema.json"
          },
          "fake-two": {
            "factory": "./fake",
            "description": "Fake schematic",
            "schema": "./fake-schema.json"
          },
        }
      }`,
        }),
      )
      .then(() => ng('generate', '--help'))
      .then(({ stdout }) => {
        assert.match(stdout, /fake[\s\S]*fake-two/);
      })
  );
}
