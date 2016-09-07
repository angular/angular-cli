import {updateTsConfig} from '../utils/project';
import {silentNg} from '../utils/process';
import {gitClean} from '../utils/git';


export default function() {
  return updateTsConfig(json => {
    json['compilerOptions']['noImplicitAny'] = true;
  })
  .then(() => silentNg('build'))
  .then(() => gitClean());
}
