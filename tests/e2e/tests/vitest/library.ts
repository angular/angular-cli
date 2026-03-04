import assert from 'node:assert/strict';
import { updateJsonFile } from '../../utils/project';
import { ng } from '../../utils/process';
import { appendToFile, createDir, writeFile } from '../../utils/fs';

export default async function (): Promise<void> {
  // Generate a library
  await ng('generate', 'library', 'my-lib', '--test-runner', 'vitest');

  // Setup Style Include Paths test
  // 1. Create a shared SCSS file
  await createDir('projects/my-lib/src/styles');
  await writeFile('projects/my-lib/src/styles/_vars.scss', '$primary-color: red;');

  // 2. Update ng-package.json to include the styles directory
  await updateJsonFile('projects/my-lib/ng-package.json', (json) => {
    json['lib'] = {
      ...json['lib'],
      styleIncludePaths: ['./src/styles'],
    };
  });

  // 3. Update the component to use SCSS and import the shared file
  // Rename CSS to SCSS
  await ng('generate', 'component', 'styled-comp', '--project=my-lib', '--style=scss');

  await appendToFile(
    'projects/my-lib/src/lib/styled-comp/styled-comp.scss',
    `
      @use 'vars';
      p { color: vars.$primary-color; }
    `,
  );

  // Run the library tests
  const { stdout } = await ng('test', 'my-lib');

  // Expect tests to pass
  assert.match(stdout, /passed/, 'Expected library tests to pass.');
}
