import { expectFileToExist, rimraf, writeMultipleFiles } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  // forcibly remove in case another test doesn't clean itself up
  await rimraf('node_modules/@angular/material');

  // Setup an invalid registry
  await writeMultipleFiles({
    '.npmrc': 'registry=http://127.0.0.1:9999',
  });

  await expectToFail(() => ng('add', '@angular/pwa'));

  await ng('add', '--registry=http://localhost:4873', '@angular/pwa');
  await expectFileToExist('src/manifest.webmanifest');
}
