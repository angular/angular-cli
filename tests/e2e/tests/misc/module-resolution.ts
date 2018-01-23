import { appendToFile, createDir, moveFile, prependToFile } from '../../utils/fs';
import { ng, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';


export default async function () {
  // TODO(architect): this test fails with weird fsevents install errors.
  // Investigate and re-enable afterwards.
  // Might be https://github.com/npm/npm/issues/19747 or https://github.com/npm/npm/issues/11973.
  return;

  await updateJsonFile('src/tsconfig.app.json', tsconfig => {
    tsconfig.compilerOptions.paths = {
      '*': ['../node_modules/*'],
    };
  });
  await ng('build');

  await createDir('xyz');
  await moveFile(
    'node_modules/@angular/common',
    'xyz/common'
  );

  await expectToFail(() => ng('build'));

  await updateJsonFile('src/tsconfig.app.json', tsconfig => {
    tsconfig.compilerOptions.paths = {
      '@angular/common': [ '../xyz/common' ],
    };
  });
  await ng('build');

  await updateJsonFile('src/tsconfig.app.json', tsconfig => {
    delete tsconfig.compilerOptions.paths;
  });

  await prependToFile('src/app/app.module.ts', 'import * as firebase from \'firebase\';');
  await appendToFile('src/app/app.module.ts', 'firebase.initializeApp({});');

  await silentNpm('install', 'firebase@3.7.8');
  await ng('build', '--aot');
  await ng('test', '--watch=false');

  await silentNpm('install', 'firebase@4.9.0');
  await ng('build', '--aot');
  await ng('test', '--watch=false');

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
