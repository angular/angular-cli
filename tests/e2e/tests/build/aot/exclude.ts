import { ng } from '../../../utils/process';
import { writeFile } from '../../../utils/fs';
import { updateJsonFile } from '../../../utils/project';

export default function () {
  // Check if **/*.spec.ts files are excluded by default.
  return Promise.resolve()
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const test = configJson['test'];
      delete test['include'];
    }))
    // This import would cause aot to fail.
    .then(() => writeFile('src/app.component.spec.ts', `
      import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';
    `))
    .then(() => ng('build', '--aot'));
}
