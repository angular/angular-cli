import {updateTsConfig} from '../utils/project';
import {ng} from '../utils/process';
import {gitClean} from '../utils/git';


export default function() {
  return updateTsConfig(json => {
    json['compilerOptions']['noImplicitAny'] = true;
  })
  .then(() => ng('build'))
  .then(() => gitClean());
}
