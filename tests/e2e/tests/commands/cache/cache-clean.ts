import { createDir, expectFileNotToExist, expectFileToExist } from '../../../utils/fs';
import { ng } from '../../../utils/process';

export default async function () {
  const cachePath = '.angular/cache';
  await createDir(cachePath);
  await expectFileToExist(cachePath);

  await ng('cache', 'clean');
  await expectFileNotToExist(cachePath);
}
