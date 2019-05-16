import * as path from 'path';
import {
  createDir,
  expectFileToMatch,
  rimraf,
  symlinkFile,
  writeMultipleFiles,
} from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function() {
  await updateJsonFile('angular.json', workspaceJson => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect['server'] = {
      builder: '@angular-devkit/build-angular:server',
      options: {
        bundleDependencies: 'none',
        outputPath: 'dist/test-project-server',
        main: 'src/main.server.ts',
        tsConfig: 'tsconfig.server.json',
      },
    };
  });

  await createDir('./dummy-lib');

  await writeMultipleFiles({
    './tsconfig.server.json': `
      {
        "extends": "./tsconfig.json",
        "compilerOptions": {
          "outDir": "../dist-server",
          "baseUrl": "./",
          "module": "commonjs",
          "types": []
        },
        "include": [
          "src/main.server.ts"
        ]
      }
    `,
    './src/main.server.ts': `
      import { dummyVersion } from 'dummy-lib';
      console.log(dummyVersion);
    `,
    // create a dummy library
    './dummy-lib/package.json': `{
      "name": "dummy-lib",
      "version": "0.0.0",
      "typings": "./main.d.ts",
      "main": "./main.js"
    }`,
    './dummy-lib/main.js': 'export const dummyVersion = 1',
    './dummy-lib/main.d.ts': 'export declare const dummyVersion = 1',
  });

  await symlinkFile(path.resolve('./dummy-lib'), path.resolve('./node_modules/dummy-lib'), 'dir');

  await ng('run', 'test-project:server');
  // when preserve symlinks is true, it should not included node_modules in the bundle
  await expectFileToMatch('dist/test-project-server/main.js', 'require("dummy-lib")');

  // cleanup the package
  await rimraf('node_modules/dummy-lib');
}
