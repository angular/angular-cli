import assert from 'node:assert/strict';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  await updateJsonFile('angular.json', (config) => {
    config.projects['test-project'].schematics = {
      '@schematics/angular:component': {
        style: 'scss',
      },
    };
  });

  // Generate component in application to verify that it's minimal
  const { stdout } = await ng('generate', 'component', 'foo');
  assert.match(stdout, /foo\.scss/);

  // Generate another project with different settings
  await ng('generate', 'application', 'test-project-two', '--no-minimal');

  await updateJsonFile('angular.json', (config) => {
    config.projects['test-project-two'].schematics = {
      '@schematics/angular:component': {
        style: 'less',
        type: 'Component',
      },
    };
  });

  const { stdout: stdout2 } = await ng(
    'generate',
    'component',
    'foo',
    '--project',
    'test-project-two',
  );
  assert.match(stdout2, /foo\.component\.less/);
}
