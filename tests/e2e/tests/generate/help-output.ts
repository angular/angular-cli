import {join} from 'path';
import {ng} from '../../utils/process';
import {writeMultipleFiles, createDir} from '../../utils/fs';


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
          }
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
      console.warn('stdout start');
      console.error(stdout);
      console.warn('stdout end');
      if (!/ng generate fake-schematics:fake <a> <b> \[options\]/.test(stdout)) {
        throw new Error('Help signature is wrong.');
      }
      if (!/opt-a[\s\S]*opt-b[\s\S]*opt-c/.test(stdout)) {
        throw new Error('Help signature options are incorrect.');
      }
    });

}
