import {ng} from '../../utils/process';
import {expectFileToExist, moveFile} from '../../utils/fs';
import {updateJsonFile} from '../../utils/project';
import {getGlobalVariable} from '../../utils/env';
import * as path from 'path';


export default function() {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  const tmp = getGlobalVariable('tmp-root');

  return Promise.resolve()
    .then(() => moveFile('node_modules/@angular/router', path.join(tmp, '@angular-router.backup')))
    .then(() => ng('build'))
    .then(() => expectFileToExist('./dist/index.html'))
    .then(() => moveFile(path.join(tmp, '@angular-router.backup'), 'node_modules/@angular/router'));
}
