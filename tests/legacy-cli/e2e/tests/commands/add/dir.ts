import { cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assetDir } from '../../../utils/assets';
import { expectFileToExist } from '../../../utils/fs';
import { ng } from '../../../utils/process';

export default async function () {
  const collectionName = 'add-collection-dir';
  const dirCollectionPath = resolve(collectionName);

  // Copy locally as bun doesn't install the dependency correctly if it has symlinks.
  await cp(assetDir(collectionName), dirCollectionPath, {
    recursive: true,
    dereference: true,
  });

  await ng('add', dirCollectionPath, '--name=blah', '--skip-confirmation');
  await expectFileToExist('blah');
}
