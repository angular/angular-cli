import assert from 'node:assert';
import { join } from 'node:path';
import { ng } from '../../utils/process';
import { writeMultipleFiles, createDir } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // setup temp collection
  await createDir('./fake-schematics');
  await writeMultipleFiles({
    './fake-schematics/package.json': JSON.stringify({
      'schematics': './collection.json',
    }),
    './fake-schematics/collection.json': JSON.stringify({
      'schematics': {
        'fake': {
          'description': 'Fake schematic',
          'schema': './fake-schema.json',
          'factory': './fake',
        },
      },
    }),
    './fake-schematics/fake-schema.json': JSON.stringify({
      '$id': 'FakeSchema',
      'title': 'Fake Schema',
      'type': 'object',
    }),
    './fake-schematics/fake.js': `
      exports.default = () => (host, context) => context.logger.info('fake schematic run.');
    `,
  });

  await updateJsonFile('angular.json', (json) => {
    json.cli ??= {};
    json.cli.schematicCollections = ['./fake-schematics'];
  });

  const { stdout: stdout1 } = await ng('generate', '--help');
  assert.match(stdout1, /Fake schematic/);

  const { stdout: stdout2 } = await ng('generate', 'fake');
  assert.match(stdout2, /fake schematic run/);

  // change cwd to a nested directory to validate the relative schematic is resolved correctly
  const originalCwd = process.cwd();
  try {
    process.chdir(join(originalCwd, 'src/app'));
    const { stdout: stdout3 } = await ng('generate', 'fake');
    assert.match(stdout3, /fake schematic run/);
  } finally {
    process.chdir(originalCwd);
  }
}
