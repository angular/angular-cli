import { createDir, moveFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  await updateJsonFile('tsconfig.json', (tsconfig) => {
    tsconfig.compilerOptions.paths = {
      '*': ['./node_modules/*'],
    };
  });
  await ng('build', '--configuration=development');

  await createDir('xyz');
  await moveFile('node_modules/@angular/platform-browser', 'xyz/platform-browser');
  await expectToFail(() => ng('build', '--configuration=development'));

  await updateJsonFile('tsconfig.json', (tsconfig) => {
    tsconfig.compilerOptions.paths = {
      '@angular/platform-browser': ['./xyz/platform-browser'],
    };
  });
  await ng('build', '--configuration=development');

  await updateJsonFile('tsconfig.json', (tsconfig) => {
    tsconfig.compilerOptions.paths = {
      '*': ['./node_modules/*'],
      '@angular/platform-browser': ['./xyz/platform-browser'],
    };
  });
  await ng('build', '--configuration=development');

  await updateJsonFile('tsconfig.json', (tsconfig) => {
    tsconfig.compilerOptions.paths = {
      '@angular/platform-browser': ['./xyz/platform-browser'],
      '*': ['./node_modules/*'],
    };
  });
  await ng('build', '--configuration=development');
  await moveFile('xyz/platform-browser', 'node_modules/@angular/platform-browser');
}
