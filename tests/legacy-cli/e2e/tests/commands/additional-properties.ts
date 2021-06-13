import { createDir, rimraf, writeMultipleFiles } from '../../utils/fs';
import { execAndWaitForOutputToMatch } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function() {
  await createDir('example-builder');
  await writeMultipleFiles({
    'example-builder/package.json': '{ "builders": "./builders.json" }',
    'example-builder/schema.json': '{ "$schema": "http://json-schema.org/draft-07/schema", "type": "object", "additionalProperties": true }',
    'example-builder/builders.json': '{ "$schema": "@angular-devkit/architect/src/builders-schema.json", "builders": { "example": { "implementation": "./example", "schema": "./schema.json" } } }',
    'example-builder/example.js': 'module.exports.default = require("@angular-devkit/architect").createBuilder((options) => { console.log(options); return { success: true }; });',
  });

  await updateJsonFile('angular.json', json => {
    const appArchitect = json.projects['test-project'].architect;
    appArchitect.example = {
      builder: './example-builder:example',
    };
  });

  await execAndWaitForOutputToMatch(
    'ng',
    ['run', 'test-project:example', '--additional', 'property'],
    /'{ '--': \[ '--additional', 'property' \] }'/,
  );

  await rimraf('example-builder');
}
