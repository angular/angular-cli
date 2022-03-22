import { join } from 'path';
import { ng } from '../../utils/process';
import { writeMultipleFiles, createDir, expectFileToExist } from '../../utils/fs';
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
  if (!stdout1.includes('ng generate component')) {
    throw new Error(`Didn't show schematics of '@schematics/angular'.`);
  }

  if (!stdout1.includes('ng generate fake')) {
    throw new Error(`Didn't show schematics of 'fake-schematics'.`);
  }

  // check registration order. Both schematics contain a component schematic verify that the first one wins.
  if (!stdout1.includes(fakeComponentSchematicDesc)) {
    throw new Error(`Didn't show fake component description.`);
  }

  // Verify execution based on ordering
  const { stdout: stdout2 } = await ng('generate', 'component');
  if (!stdout2.includes('fake component schematic run')) {
    throw new Error(`stdout didn't contain 'fake component schematic run'.`);
  }

  await updateJsonFile('angular.json', (json) => {
    json.cli ??= {};
    json.cli.schematicCollections = ['@schematics/angular', 'fake-schematics'];
  });

  const { stdout: stdout3 } = await ng('generate', '--help');
  if (!stdout3.includes('ng generate component [name]')) {
    throw new Error(`Didn't show component description from @schematics/angular.`);
  }
  if (stdout3.includes(fakeComponentSchematicDesc)) {
    throw new Error(`Shown fake component description, when it shouldn't.`);
  }

  // Verify execution based on ordering
  const projectDir = join('src', 'app');
  const componentDir = join(projectDir, 'test-component');
  await ng('generate', 'component', 'test-component');
  await expectFileToExist(componentDir);
}
