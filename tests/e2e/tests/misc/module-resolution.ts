import { appendToFile, prependToFile } from '../../utils/fs';
import { ng, silentNpm } from '../../utils/process';


export default async function () {
  await silentNpm('install', 'firebase@3.7.8');

  await prependToFile('src/app/app.module.ts', 'import * as firebase from \'firebase\';');
  await appendToFile('src/app/app.module.ts', 'firebase.initializeApp({});');

  await ng('build');
  await ng('build', '--aot');
}
