import { expectFileToMatch } from '../../utils/fs';
import { ng, execAndWaitForOutputToMatch, killAllProcesses } from '../../utils/process';

export default function () {
  return ng('eject')
    .then(() => expectFileToMatch('angular.json', /\"build-webpack\":/))
    .then(() => expectFileToMatch('angular.json', /\"serve-webpack\":/))
    .then(() => ng('run', 'test-project:build-webpack'))
    .then(() => ng('run', 'test-project:build-webpack:production'))
    // Use the default e2e with no devServerTarget.
    .then(() => execAndWaitForOutputToMatch('ng', ['run', 'test-project:serve-webpack'],
      /: Compiled successfully./))
    .then(() => ng('e2e', 'test-project-e2e', '--devServerTarget=',
      '--baseUrl=http://localhost:8080'))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
