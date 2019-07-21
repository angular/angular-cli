// TODO(architect): edit the architect config instead of the cli config.

import {
  ng,
  npm,
  execAndWaitForOutputToMatch,
  killAllProcesses
} from '../../utils/process';
import {updateJsonFile} from '../../utils/project';
import {expectToFail} from '../../utils/utils';
import {moveFile, copyFile, replaceInFile} from '../../utils/fs';

export default function () {
  // Should fail without updated webdriver
  return updateJsonFile('package.json', packageJson => {
    // Add to npm scripts to make running the binary compatible with Windows
    const scripts = packageJson['scripts'];
    scripts['wd:clean'] = 'webdriver-manager clean';
  })
    .then(() => npm('run', 'wd:clean'))
    .then(() => expectToFail(() => ng('e2e', 'test-project', '--no-webdriver-update', '--devServerTarget=')))
    // Add back the pre-defined version of webdriver. This script is defined when making projects.
    .then(() => npm('run', 'webdriver-update'))
    // Should fail without serving
    .then(() => expectToFail(() => ng('e2e', 'test-project', '--devServerTarget=')))
    // These should work.
    .then(() => ng('e2e', 'test-project'))
    .then(() => ng('e2e', 'test-project', '--devServerTarget=test-project:serve:production'))
    // Should accept different config file
    .then(() => moveFile('./e2e/protractor.conf.js',
      './e2e/renamed-protractor.conf.js'))
    .then(() => ng('e2e', 'test-project',
      '--protractorConfig=e2e/renamed-protractor.conf.js'))
    .then(() => moveFile('./e2e/renamed-protractor.conf.js', './e2e/protractor.conf.js'))
    // Should accept different multiple spec files
    .then(() => moveFile('./e2e/src/app.e2e-spec.ts',
      './e2e/src/renamed-app.e2e-spec.ts'))
    .then(() => copyFile('./e2e/src/renamed-app.e2e-spec.ts',
      './e2e/src/another-app.e2e-spec.ts'))
    .then(() => ng('e2e', 'test-project', '--specs', './e2e/renamed-app.e2e-spec.ts',
      '--specs', './e2e/another-app.e2e-spec.ts'))
    // Rename the spec back to how it was.
    .then(() => moveFile('./e2e/src/renamed-app.e2e-spec.ts',
      './e2e/src/app.e2e-spec.ts'))
    // Suites block need to be added in the protractor.conf.js file to test suites
    .then(() => replaceInFile('e2e/protractor.conf.js', `allScriptsTimeout: 11000,`,
      `allScriptsTimeout: 11000,
          suites: {
            app: './e2e/src/app.e2e-spec.ts'
          },
    `))
    .then(() => ng('e2e', 'test-project', '--suite=app'))
    // Remove suites block from protractor.conf.js file after testing suites
    .then(() => replaceInFile('e2e/protractor.conf.js', `allScriptsTimeout: 11000,
          suites: {
            app: './e2e/src/app.e2e-spec.ts'
          },
    `, `allScriptsTimeout: 11000,`
    ))
    // Should start up Element Explorer
    .then(() => execAndWaitForOutputToMatch('ng', ['e2e', 'test-project', '--element-explorer'],
      /Element Explorer/))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    })
    // Should run side-by-side with `ng serve`
    .then(() => execAndWaitForOutputToMatch('ng', ['serve'],
      /: Compiled successfully./))
    .then(() => ng('e2e', 'test-project', '--devServerTarget='))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
