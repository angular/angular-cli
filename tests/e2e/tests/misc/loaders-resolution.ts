import { createDir, moveFile } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  await createDir('node_modules/@angular/cli/node_modules');
  await moveFile(
    'node_modules/@ngtools',
    'node_modules/@angular/cli/node_modules/@ngtools'
  );

  await ng('build');
}
