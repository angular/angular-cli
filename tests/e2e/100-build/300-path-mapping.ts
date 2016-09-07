import {ng} from '../utils/process';
import {updateTsConfig} from '../utils/project';
import {expectToFail} from '../utils/utils';
import {gitClean} from '../utils/git';


export default function() {
  return updateTsConfig(json => {
      json['compilerOptions']['baseUrl'] = '';
      json['compilerOptions']['paths'] = {
        '@angular/*': []
      };
    })
    .then(() => expectToFail(() => ng('build')))
    .then(() => updateTsConfig(json => {
      json['compilerOptions']['paths'] = {
        '@angular/*': [ '../node_modules/@angular/*' ]
      };
    }))
    .then(() => ng('build'))
    .then(() => gitClean());
}
