/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

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

  // 2. Update angular.json to include the styles directory
  await updateJsonFile('angular.json', (json) => {
    const buildOptions = (json['projects']['my-lib']['architect']['build']['options'] ??= {});
    buildOptions.stylePreprocessorOptions = {
      includePaths: ['projects/my-lib/src/styles'],
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

  // 4. Generate a secondary entry point and verify its tests are also executed
  await ng('generate', 'entry-point', 'secondary', '--project=my-lib');

  // Run the library tests
  const { stdout } = await ng('test', 'my-lib');

  // Expect tests to pass (my-lib, styled-comp, and secondary)
  assert.match(stdout, /3 passed/, 'Expected 3 library tests to pass.');
}
