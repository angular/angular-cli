import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default function () {
  return Promise.resolve()
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['platform'] = 'server';
    }))
    .then(() => expectToFail(() => ng('serve')))
    .then(() => expectToFail(() => ng('test')))
    .then(() => expectToFail(() => ng('e2e')))
    .then(() => expectToFail(() => ng('eject')));
}
