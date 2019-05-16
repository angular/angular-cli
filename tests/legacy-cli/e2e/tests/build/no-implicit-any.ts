import {updateTsConfig} from '../../utils/project';
import {ng} from '../../utils/process';


export default function() {
  return updateTsConfig(json => {
    json['compilerOptions']['noImplicitAny'] = true;
  })
  .then(() => ng('build'));
}
