import {ng} from '../../utils/process';
import * as fs from '../../utils/fs';


const options = {
  encoding: 'utf8'
};


export default function() {
  return Promise.resolve()
    .then(() => fs.prependToFile('./src/tsconfig.app.json', '\ufeff', options))
    .then(() => fs.prependToFile('./.angular-cli.json', '\ufeff', options))
    .then(() => ng('build', '--environment=dev'));
}
