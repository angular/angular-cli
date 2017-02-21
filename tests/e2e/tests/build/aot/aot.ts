import {ng} from '../../../utils/process';
import {expectFileToMatch, writeFile, createDir} from '../../../utils/fs';

export default function() {
  return ng('build', '--aot')
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /bootstrapModuleFactory.*\/\* AppModuleNgFactory \*\//))
    // Check if **/*.spec.ts files are excluded by default. This import will cause aot to fail.
    .then(() => createDir('./src/much/deep/folder'))
    .then(() => writeFile('./src/much/deep/folder/unit-test.spec.ts', `
      import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';
    `))
    .then(() => ng('build', '--aot'));
}
