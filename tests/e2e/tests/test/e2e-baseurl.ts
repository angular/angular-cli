import { ng, killAllProcesses } from '../../utils/process';
import { expectToFail } from '../../utils/utils';
import { ngServe } from '../../utils/project';
import { updateJsonFile } from '../../utils/project';
import { getGlobalVariable } from '../../utils/env';

export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => expectToFail(() => ng('e2e', '--no-serve')))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson.defaults;
      app.serve = { port: 4400 };
    }))
    .then(() => ngServe())
    .then(() => expectToFail(() => ng('e2e', '--no-serve')))
    .then(() => ng('e2e', '--no-serve', '--base-href=http://localhost:4400'))
    .then(() => ng('e2e', '--no-serve', '--port=4400'))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
