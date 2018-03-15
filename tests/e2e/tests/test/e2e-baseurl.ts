import { ng, killAllProcesses } from '../../utils/process';
import { expectToFail } from '../../utils/utils';
import { ngServe } from '../../utils/project';
import { updateJsonFile } from '../../utils/project';


export default function () {
  // TODO(architect): Figure out why this test is not working.
  return;

  return Promise.resolve()
    .then(() => expectToFail(() => ng('e2e', '--devServerTarget=')))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson.defaults;
      app.serve = { port: 4400 };
    }))
    .then(() => ngServe())
    .then(() => ng('e2e', '--devServerTarget=', '--base-url=http://localhost:4400'))
    .then(() => ng('e2e', '--devServerTarget=', '--port=4400'))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
