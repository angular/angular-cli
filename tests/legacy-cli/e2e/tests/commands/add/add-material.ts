import { expectFileToMatch, rimraf } from '../../../utils/fs';
import { ng } from '../../../utils/process';


export default async function () {
  // forcibly remove in case another test doesn't clean itself up
  await rimraf('node_modules/@angular/material');

  await ng('add', '@angular/material');
  await expectFileToMatch('package.json', /@angular\/material/);
}
