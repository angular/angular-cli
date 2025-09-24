import { copyFile } from 'node:fs/promises';
import { assetDir } from '../../../utils/assets';
import { expectFileToExist } from '../../../utils/fs';
import { ng } from '../../../utils/process';

export default async function () {
  // Avoids ERR_PNPM_ENAMETOOLONG errors.
  const tarball = './add-collection.tgz';
  await copyFile(assetDir(tarball), tarball);

  await ng('add', tarball, '--name=blah', '--skip-confirmation');
  await expectFileToExist('blah');
}
