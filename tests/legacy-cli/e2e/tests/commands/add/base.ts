import { assetDir } from '../../../utils/assets';
import { expectFileToExist, rimraf, symlinkFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';


export default async function () {
  await symlinkFile(assetDir('add-collection'), `./node_modules/add-collection`, 'dir');

  await ng('add', 'add-collection');
  await expectFileToExist('empty-file');

  await ng('add', 'add-collection', '--name=blah');
  await expectFileToExist('blah');

  await expectToFail(() => ng('add', 'add-collection'));  // File already exists.

  // Cleanup the package
  await rimraf('node_modules/add-collection');
}
