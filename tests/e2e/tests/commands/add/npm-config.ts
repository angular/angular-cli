import { writeFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';

export default async function () {
  // Works with before option
  await writeFile('.npmrc', `before=${new Date().toISOString()}`);
  await ng('add', '@angular/pwa', '--skip-confirmation');
}
