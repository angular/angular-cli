import {ng} from '../../utils/process';
import {updateJsonFile} from '../../utils/project';
import {expectToFail} from '../../utils/utils';


export default function() {
  // Skip this in ejected tests.

  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  return Promise.resolve()
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['budgets'] = [{ name: 'main', budget: 100000 }]
    }))
    .then(() => ng('build', '--prod'))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['budgets'] = [{ name: 'main', budget: 0 }]
    }))
    .then(() => expectToFail(() => ng('build', '--prod')));
}
