import {
  ng,
  npm,
  execAndWaitForOutputToMatch,
  silentExecAndWaitForOutputToMatch,
  killAllProcesses
} from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { moveFile, copyFile } from '../../utils/fs';


export default function () {
  // Should fail without updated webdriver
  return updateJsonFile('package.json', packageJson => {
    // Add to npm scripts to make running the binary compatible with Windows
    const scripts = packageJson['scripts'];
    scripts['wd:clean'] = 'webdriver-manager clean';
  })
    .then(() => npm('run', 'wd:clean'))
    .then(() => expectToFail(() => ng('e2e', '--no-webdriver-update', '--no-serve')))
    // Should fail without serving
    .then(() => expectToFail(() => ng('e2e', '--no-serve')))
    // These should work.
    .then(() => ng('e2e'))
    .then(() => ng('e2e', '--prod'))
    // Should use port in baseUrl
    .then(() => ng('e2e', '--port', '4400'))
    // Should accept different config file
    .then(() => moveFile('./protractor.conf.js', './renamed-protractor.conf.js'))
    .then(() => ng('e2e', '--config', './renamed-protractor.conf.js'))
    .then(() => moveFile('./renamed-protractor.conf.js', './protractor.conf.js'))
    // Should accept different multiple spec files
    .then(() => moveFile('./e2e/app.e2e-spec.ts', './e2e/renamed-app.e2e-spec.ts'))
    .then(() => copyFile('./e2e/renamed-app.e2e-spec.ts', './e2e/another-app.e2e-spec.ts'))
    .then(() => ng('e2e', '--specs', './e2e/renamed-app.e2e-spec.ts',
      '--specs', './e2e/another-app.e2e-spec.ts'))
    // Should start up Element Explorer
    .then(() => execAndWaitForOutputToMatch('ng', ['e2e', '--element-explorer'],
      /Element Explorer/))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    })
    // Should run side-by-side with `ng serve`
    .then(() => silentExecAndWaitForOutputToMatch('ng', ['serve'],
      /webpack: Compiled successfully./))
    .then(() => ng('e2e'));
}
