import { appendToFile, expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';
import { updateJsonFile } from '../../utils/project';
import { getGlobalVariable } from '../../utils/env';


export default function () {

  let knownES6Module = '@angular/core/@angular/core';

  // TODO: swap this check for ng5.
  if (getGlobalVariable('argv').nightly) {
    // Angular 5 has a different folder structure.
    knownES6Module = '@angular/core/esm2015/core';
  }

  return Promise.resolve()
    // Force import a known ES6 module and build with prod.
    // ES6 modules will cause UglifyJS to fail on a ES5 compilation target (default).
    .then(() => appendToFile('src/main.ts', `
      import * as es6module from '${knownES6Module}';
      console.log(es6module);
    `))
    .then(() => expectToFail(() => ng('build', '--prod')))
    .then(() => updateJsonFile('tsconfig.json', configJson => {
      const compilerOptions = configJson['compilerOptions'];
      compilerOptions['target'] = 'es2015';
    }))
    .then(() => ng('build', '--prod', '--output-hashing=none'))
    // Check class constructors are present in the vendor output.
    .then(() => expectFileToMatch('dist/vendor.bundle.js', /class \w{constructor\(\){/));
}
