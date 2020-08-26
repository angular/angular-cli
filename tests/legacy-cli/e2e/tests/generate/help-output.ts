import {join} from 'path';
import {ng, ProcessOutput} from '../../utils/process';
import {writeMultipleFiles, createDir} from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';


export default function() {
  // setup temp collection
  const genRoot = join('node_modules/fake-schematics/');

  return Promise.resolve()
    .then(() => createDir(genRoot))
    .then(() => writeMultipleFiles({
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
        "id": "FakeSchema",
        "title": "Fake Schema",
        "type": "object",
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
        },
        "required": []
      }`,
      [join(genRoot, 'fake.js')]: `
      function def(options) {
        return (host, context) => {
          return host;
        };
      }
      exports.default = def;
      `},
    ))
    .then(() => ng('generate', 'fake-schematics:fake', '--help'))
    .then(({stdout}) => {
      if (!/ng generate fake-schematics:fake <a> <b> \[options\]/.test(stdout)) {
        throw new Error('Help signature is wrong (1).');
      }
      if (!/opt-a[\s\S]*opt-b[\s\S]*opt-c/.test(stdout)) {
        throw new Error('Help signature options are incorrect.');
      }
    })
    // set up default collection.
    .then(() => updateJsonFile('angular.json', json => {
      json.cli = json.cli || {} as any;
      json.cli.defaultCollection = 'fake-schematics';
    }))
    .then(() => ng('generate', 'fake', '--help'))
    // verify same output
    .then(({stdout}) => {
      if (!/ng generate fake <a> <b> \[options\]/.test(stdout)) {
        throw new Error('Help signature is wrong (2).');
      }
      if (!/opt-a[\s\S]*opt-b[\s\S]*opt-c/.test(stdout)) {
        throw new Error('Help signature options are incorrect.');
      }
    })

    // should print all the available schematics in a collection
    // when a collection has more than 1 schematic
    .then(() => writeMultipleFiles({
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
    }))
    .then(() => ng('generate', '--help'))
    .then(({stdout}) => {
      if (!/Collection \"fake-schematics\" \(default\):[\s\S]*fake[\s\S]*fake-two/.test(stdout)) {
        throw new Error(
          `Help result is wrong, it didn't contain all the schematics.`);
      }
    });

}
