/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { appendToFile, createDir, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  await ng('generate', 'library', 'mylib');
  await createLibraryEntryPoint('secondary');
  await createLibraryEntryPoint('another');

  // Scenario #1 where we use wildcard path mappings for secondary entry-points.
  await updateJsonFile('tsconfig.json', (json) => {
    json.compilerOptions.paths = { 'mylib': ['./dist/mylib'], 'mylib/*': ['./dist/mylib/*'] };
  });

  await appendToFile(
    'src/app/app.config.ts',
    `
      import * as secondary from 'mylib/secondary';
      import * as another from 'mylib/another';

      console.log({
        secondary,
        another
      });
      `,
  );

  await ng('build', 'mylib');
  await ng('build');

  // Scenario #2 where we don't use wildcard path mappings.
  await updateJsonFile('tsconfig.json', (json) => {
    json.compilerOptions.paths = {
      'mylib': ['./dist/mylib'],
      'mylib/secondary': ['./dist/mylib/secondary'],
      'mylib/another': ['./dist/mylib/another'],
    };
  });

  await ng('build');
}

async function createLibraryEntryPoint(name: string): Promise<void> {
  await createDir(`projects/mylib/${name}`);
  await writeFile(`projects/mylib/${name}/index.ts`, `export const foo = 'foo';`);

  await writeFile(
    `projects/mylib/${name}/ng-package.json`,
    JSON.stringify({
      lib: {
        entryFile: 'index.ts',
      },
    }),
  );
}
