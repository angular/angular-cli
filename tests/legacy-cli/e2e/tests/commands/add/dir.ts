import { assetDir } from '../../../utils/assets';
import { expectFileToExist } from '../../../utils/fs';
import { ng } from '../../../utils/process';


export default async function () {
  await ng('add', assetDir('add-collection'), '--name=blah');
  await expectFileToExist('blah');
}
