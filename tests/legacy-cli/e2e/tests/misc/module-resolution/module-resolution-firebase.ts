import { appendToFile, prependToFile } from '../../../utils/fs';
import { installPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  await updateJsonFile('tsconfig.json', (tsconfig) => {
    delete tsconfig.compilerOptions.paths;
  });

  await prependToFile('src/app/app.module.ts', "import * as firebase from 'firebase';");
  await appendToFile('src/app/app.module.ts', 'firebase.initializeApp({});');

  await installPackage('firebase@4.9.0');
  await ng('build', '--aot', '--configuration=development');

  await updateJsonFile('tsconfig.json', (tsconfig) => {
    tsconfig.compilerOptions.paths = {};
  });

  await ng('build', '--configuration=development');
  await updateJsonFile('tsconfig.json', (tsconfig) => {
    tsconfig.compilerOptions.paths = {
      '@app/*': ['*'],
      '@lib/*/test': ['*/test'],
    };
  });

  await ng('build', '--configuration=development');
  await updateJsonFile('tsconfig.json', (tsconfig) => {
    tsconfig.compilerOptions.paths = {
      '@firebase/polyfill': ['./node_modules/@firebase/polyfill/index.ts'],
    };
  });

  await expectToFail(() => ng('build', '--configuration=development'));

  await updateJsonFile('tsconfig.json', (tsconfig) => {
    tsconfig.compilerOptions.paths = {
      '@firebase/polyfill*': ['./node_modules/@firebase/polyfill/index.ts'],
    };
  });
  await expectToFail(() => ng('build', '--configuration=development'));
}
