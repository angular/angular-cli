import {ng} from '../../utils/process';
import {updateJsonFile} from '../../utils/project';
import {expectToFail} from '../../utils/utils';


export default function() {
  return Promise.resolve()
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['budgets'] = [{
        type: 'initial',
        budget: 1,
        unit: 'kB',
        severity: 'Warning'
      }];
    }))
    .then(() => ng('build', '--prod'))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['budgets'] = [{
        type: 'initial',
        budget: 1,
        unit: 'kB',
        severity: 'Error'
      }];
    }))
    .then(() => expectToFail(() => ng('build', '--prod')));
}
