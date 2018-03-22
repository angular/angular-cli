import { ng, killAllProcesses } from '../../utils/process';
import { expectToFail } from '../../utils/utils';
import { ngServe } from '../../utils/project';
import { updateJsonFile } from '../../utils/project';


export default function () {
  // TODO(architect): Figure out why this test is not working.
  return;

  return Promise.resolve()
    .then(() => expectToFail(() => ng('e2e', 'test-project-e2e', '--devServerTarget=')))
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.serve.options.port = 4400;
    }))
    .then(() => ngServe())
    .then(() => ng('e2e', 'test-project-e2e', '--devServerTarget=', '--base-url=http://localhost:4400'))
    .then(() => ng('e2e', 'test-project-e2e', '--devServerTarget=', '--port=4400'))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
