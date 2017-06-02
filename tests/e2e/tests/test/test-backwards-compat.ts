import { ng } from '../../utils/process';
import { replaceInFile } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';

export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  // Old configs (with the cli preprocessor listed) should still supported.
  return Promise.resolve()
    .then(() => replaceInFile('karma.conf.js',
      'coverageIstanbulReporter: {', `
      files: [
          { pattern: './src/test.ts', watched: false }
        ],
        preprocessors: {
          './src/test.ts': ['@angular/cli']
        },
        mime: {
          'text/x-typescript': ['ts','tsx']
        },
        coverageIstanbulReporter: {
      `))
    .then(() => ng('test', '--single-run'));
}
