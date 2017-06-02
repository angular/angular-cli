import {ng} from '../../utils/process';
import * as fs from '../../utils/fs';
import {getGlobalVariable} from '../../utils/env';


const options = {
  encoding: 'utf8'
};


export default function() {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => fs.prependToFile('./src/tsconfig.app.json', '\ufeff', options))
    .then(() => fs.prependToFile('./.angular-cli.json', '\ufeff', options))
    .then(() => ng('build', '--env=dev'));
}
