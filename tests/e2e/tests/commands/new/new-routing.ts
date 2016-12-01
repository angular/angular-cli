import * as path from 'path';
import {ng} from '../../../utils/process';
import {getGlobalVariable} from '../../../utils/env';

export default function() {
  return Promise.resolve()
    .then(() => process.chdir(getGlobalVariable('tmp-root')))
    .then(() => ng('new', 'routing-project', '--routing'))
    .then(() => process.chdir(path.join('routing-project')))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
