import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { isAbsolute } from 'node:path';
import { getGlobalVariable } from '../../utils/env';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // General secondary application project
  await ng('generate', 'application', 'secondary-project', '--skip-install');
  // Setup webpack builder if esbuild is not requested on the commandline
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
  if (useWebpackBuilder) {
    await updateJsonFile('angular.json', (json) => {
      const build = json['projects']['secondary-project']['architect']['build'];
      build.builder = '@angular-devkit/build-angular:browser';
      build.options = {
        ...build.options,
        main: build.options.browser,
        browser: undefined,
        outputPath: 'dist/secondary-project',
        index: 'src/index.html',
      };

      build.configurations.development = {
        ...build.configurations.development,
        vendorChunk: true,
        namedChunks: true,
        buildOptimizer: false,
      };
    });
  }

  await ng('build', 'secondary-project', '--configuration=development');
  await ng('build', '--output-hashing=none', '--source-map', '--configuration=development');

  const sourceMapPath = getGlobalVariable('argv')['esbuild']
    ? './dist/secondary-project/browser/main.js.map'
    : './dist/secondary-project/main.js.map';
  const content = fs.readFileSync(sourceMapPath, 'utf8');
  const { sources } = JSON.parse(content) as { sources: string[] };
  let mainFileFound = false;
  for (const source of sources) {
    assert(!isAbsolute(source), `Expected ${source} to be relative.`);

    if (source.endsWith('main.ts')) {
      mainFileFound = true;
      assert(
        source === 'projects/secondary-project/src/main.ts' ||
          source === './projects/secondary-project/src/main.ts',
        `Expected main file ${source} to be relative to the workspace root.`,
      );
    }
  }

  assert(mainFileFound, 'Could not find the main file in the application sourcemap sources array.');
}
