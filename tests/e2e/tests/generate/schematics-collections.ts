import assert from 'node:assert/strict';
import { join } from 'node:path';
import { createDir, expectFileToExist, writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // setup temp collection
  const genRoot = join('node_modules/fake-schematics/');
  const fakeComponentSchematicDesc = 'Fake component schematic';

  await createDir(genRoot);
  await writeMultipleFiles({
    [join(genRoot, 'package.json')]: JSON.stringify({
      'schematics': './collection.json',
    }),
    [join(genRoot, 'collection.json')]: JSON.stringify({
      'schematics': {
        'fake': {
          'description': 'Fake schematic',
          'schema': './fake-schema.json',
          'factory': './fake',
        },
        'component': {
          'description': fakeComponentSchematicDesc,
          'schema': './fake-schema.json',
          'factory': './fake-component',
        },
      },
    }),
    [join(genRoot, 'fake-schema.json')]: JSON.stringify({
      '$id': 'FakeSchema',
      'title': 'Fake Schema',
      'type': 'object',
    }),
    [join(genRoot, 'fake.js')]: `
      exports.default = function (options) {
        return (host, context) => {
          console.log('fake schematic run.');
        };
      }
    `,
    [join(genRoot, 'fake-component.js')]: `
      exports.default = function (options) {
        return (host, context) => {
          console.log('fake component schematic run.');
        };
      }
    `,
  });

  await updateJsonFile('angular.json', (json) => {
    json.cli ??= {};
    json.cli.schematicCollections = ['fake-schematics', '@schematics/angular'];
  });

  // should display schematics for all schematics
  const { stdout: stdout1 } = await ng('generate', '--help');
  assert.match(stdout1, /ng generate component/);
  assert.match(stdout1, /ng generate fake/);

  // check registration order. Both schematics contain a component schematic verify that the first one wins.
  assert.match(stdout1, new RegExp(fakeComponentSchematicDesc));

  // Verify execution based on ordering
  const { stdout: stdout2 } = await ng('generate', 'component');
  assert.match(stdout2, /fake component schematic run/);

  await updateJsonFile('angular.json', (json) => {
    json.cli ??= {};
    json.cli.schematicCollections = ['@schematics/angular', 'fake-schematics'];
  });

  const { stdout: stdout3 } = await ng('generate', '--help');
  assert.match(stdout3, /ng generate component \[name\]/);
  assert.doesNotMatch(stdout3, new RegExp(fakeComponentSchematicDesc));

  // Verify execution based on ordering
  const projectDir = join('src', 'app');
  const componentDir = join(projectDir, 'test-component');
  await ng('generate', 'component', 'test-component');
  await expectFileToExist(componentDir);
}
