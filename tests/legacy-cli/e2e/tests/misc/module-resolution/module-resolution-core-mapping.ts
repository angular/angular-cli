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
  await moveFile('node_modules/@angular/common', 'xyz/common');
  await expectToFail(() => ng('build', '--configuration=development'));

  await updateJsonFile('tsconfig.json', (tsconfig) => {
    tsconfig.compilerOptions.paths = {
      '@angular/common': ['./xyz/common'],
    };
  });
  await ng('build', '--configuration=development');

  await updateJsonFile('tsconfig.json', (tsconfig) => {
    tsconfig.compilerOptions.paths = {
      '*': ['./node_modules/*'],
      '@angular/common': ['./xyz/common'],
    };
  });
  await ng('build', '--configuration=development');

  await updateJsonFile('tsconfig.json', (tsconfig) => {
    tsconfig.compilerOptions.paths = {
      '@angular/common': ['./xyz/common'],
      '*': ['./node_modules/*'],
    };
  });
  await ng('build', '--configuration=development');
  await moveFile('xyz/common', 'node_modules/@angular/common');
}
