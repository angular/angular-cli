import {ng} from '../../../utils/process';
import {createProject} from '../../../utils/project';
import {getGlobalVariable} from '../../../utils/env';
import {join} from 'path';

const denodeify = require('denodeify');
const rimraf = denodeify(require('rimraf'));

export default function() {
  return Promise.resolve()
    .then(() => rimraf(join(getGlobalVariable('tmp-root'), 'routing-project')))
    .then(() => createProject('routing-project', '--routing'))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
