import { expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';


export default async function () {
  await ng('add', '@angular/material');
  await expectFileToMatch('package.json', /@angular\/material/);
}
