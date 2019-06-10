import { appendToFile, createDir, moveFile, prependToFile } from '../../utils/fs';
import { ng, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';


export default async function () {
  await updateJsonFile('tsconfig.json', tsconfig => {
    tsconfig.compilerOptions.paths = {
      '*': ['./node_modules/*'],
    };
  });
  await ng('build');

  await createDir('xyz');
  await moveFile(
    'node_modules/@angular/common',
    'xyz/common',
  );

  await expectToFail(() => ng('build'));

  await updateJsonFile('tsconfig.json', tsconfig => {
    tsconfig.compilerOptions.paths = {
      '@angular/common': [ './xyz/common' ],
    };
  });
  await ng('build');

  await updateJsonFile('tsconfig.json', tsconfig => {
    tsconfig.compilerOptions.paths = {
      '*': ['./node_modules/*'],
      '@angular/common': [ './xyz/common' ],
    };
  });
  await ng('build');

  await updateJsonFile('tsconfig.json', tsconfig => {
    tsconfig.compilerOptions.paths = {
      '@angular/common': [ './xyz/common' ],
      '*': ['./node_modules/*'],
    };
  });
  await ng('build');

  await updateJsonFile('tsconfig.json', tsconfig => {
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

  await updateJsonFile('tsconfig.json', tsconfig => {
    tsconfig.compilerOptions.paths = {};
  });
  await ng('build');

  await updateJsonFile('tsconfig.json', tsconfig => {
    tsconfig.compilerOptions.paths = {
      '@app/*': ['*'],
      '@lib/*/test': ['*/test'],
    };
  });
  await ng('build');

  await updateJsonFile('tsconfig.json', tsconfig => {
    tsconfig.compilerOptions.paths = {
      '@firebase/polyfill': ['./node_modules/@firebase/polyfill/index.ts'],
    };
  });
  await expectToFail(() => ng('build'));

  await updateJsonFile('tsconfig.json', tsconfig => {
    tsconfig.compilerOptions.paths = {
      '@firebase/polyfill*': ['./node_modules/@firebase/polyfill/index.ts'],
    };
  });
  await expectToFail(() => ng('build'));
}
