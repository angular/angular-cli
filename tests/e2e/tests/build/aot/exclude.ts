import { ng } from '../../../utils/process';
import { writeFile, moveFile } from '../../../utils/fs';
import { updateJsonFile } from '../../../utils/project';
import { getGlobalVariable } from '../../../utils/env';

export default function () {
  // Disable parts of it in webpack tests.
  const ejected = getGlobalVariable('argv').eject;

  // Skip this in ng5 tests, it only happens in ng2/4.
  // This check should be changed once ng5 because the default.
  if (getGlobalVariable('argv').nightly) {
    return Promise.resolve();
  }

  // Check if **/*.spec.ts files are excluded by default.
  return Promise.resolve()
    // This import would cause aot to fail.
    .then(() => writeFile('src/another.component.spec.ts', `
       import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';
     `))
    .then(() => ng('build', '--aot'))
    // Verify backwards compatibility with old project using the shared tsconfig.
    .then(() => moveFile('src/tsconfig.app.json', 'src/tsconfig.json'))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app.tsconfig = 'tsconfig.json';
      delete app['testTsconfig'];
    }))
    .then(() => updateJsonFile('src/tsconfig.json', tsconfigJson => {
      delete tsconfigJson['exclude'];
      delete tsconfigJson['compilerOptions']['types'];
    }))
    .then(() => ng('build', '--aot'))
    .then(() => !ejected && ng('test', '--single-run'));
}
