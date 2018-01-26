import { appendToFile, prependToFile } from '../../utils/fs';
import { ng, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';


export default async function () {
  await prependToFile('src/app/app.module.ts', 'import * as firebase from \'firebase\';');
  await appendToFile('src/app/app.module.ts', 'firebase.initializeApp({});');

  await silentNpm('install', 'firebase@3.7.8');
  await ng('build', '--aot');
  await ng('test', '--single-run');

  await silentNpm('install', 'firebase@4.9.0');
  await ng('build', '--aot');
  await ng('test', '--single-run');

  // await prependToFile('src/app/app.module.ts', 'import * as firebase from \'firebase\';');
  // await appendToFile('src/app/app.module.ts', 'firebase.initializeApp({});');
  // await ng('build');

  await updateJsonFile('src/tsconfig.app.json', tsconfig => {
    tsconfig.compilerOptions.paths = {};
  });
  await ng('build');

  await updateJsonFile('src/tsconfig.app.json', tsconfig => {
    tsconfig.compilerOptions.paths = {
      '@app/*': ['*'],
      '@lib/*/test': ['*/test'],
    };
  });
  await ng('build');

  await updateJsonFile('src/tsconfig.app.json', tsconfig => {
    tsconfig.compilerOptions.paths = {
      '@firebase/polyfill': ['@firebase/polyfill/index.ts'],
    };
  });
  await expectToFail(() => ng('build'));

  await updateJsonFile('src/tsconfig.app.json', tsconfig => {
    tsconfig.compilerOptions.paths = {
      '@firebase/polyfill*': ['@firebase/polyfill/index.ts'],
    };
  });
  await expectToFail(() => ng('build'));
}
