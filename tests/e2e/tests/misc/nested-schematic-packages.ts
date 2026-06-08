import { copyAssets } from '../../utils/assets';
import { expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  await copyAssets('nested-schematic-main', 'nested');
  await copyAssets('nested-schematic-dependency', 'nested/node_modules/empty-app-nested');

  await ng('generate', './nested:test');
  await expectFileToExist('empty-file');
}
