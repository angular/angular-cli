import { ng } from '../../utils/process';
import { replaceInFile } from '../../utils/fs';


export default function () {
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
