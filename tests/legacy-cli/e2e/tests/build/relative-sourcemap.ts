import * as fs from 'fs';

import { isAbsolute } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // General secondary application project
  await ng('generate', 'application', 'secondary-project', '--skip-install');
  // Setup esbuild builder if requested on the commandline
  const useEsbuildBuilder = !!getGlobalVariable('argv')['esbuild'];
  if (useEsbuildBuilder) {
    await updateJsonFile('angular.json', (json) => {
      json['projects']['secondary-project']['architect']['build']['builder'] =
        '@angular-devkit/build-angular:browser-esbuild';
    });
  }

  await ng('build', 'secondary-project', '--configuration=development');

  await ng('build', '--output-hashing=none', '--source-map', '--configuration=development');
  const content = fs.readFileSync('./dist/secondary-project/main.js.map', 'utf8');
  const { sources } = JSON.parse(content) as { sources: string[] };
  let mainFileFound = false;
  for (const source of sources) {
    if (isAbsolute(source)) {
      throw new Error(`Expected ${source} to be relative.`);
    }

    if (source.endsWith('main.ts')) {
      mainFileFound = true;
      if (
        source !== 'projects/secondary-project/src/main.ts' &&
        source !== './projects/secondary-project/src/main.ts'
      ) {
        throw new Error(`Expected main file ${source} to be relative to the workspace root.`);
      }
    }
  }

  if (!mainFileFound) {
    throw new Error('Could not find the main file in the application sourcemap sources array.');
  }
}
