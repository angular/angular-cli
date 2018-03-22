import {ng} from '../../utils/process';
import * as fs from '../../utils/fs';


const options = {
  encoding: 'utf8'
};


export default function() {
  // TODO: this test fails on JSON parsing
  return Promise.resolve()
    .then(() => fs.prependToFile('./projects/test-project/tsconfig.app.json', '\ufeff', options))
    .then(() => fs.prependToFile('angular.json', '\ufeff', options))
    .then(() => ng('build', '--environment=dev'));
}
