import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch
} from '../../utils/process';
import { readFile, writeFile } from '../../utils/fs';
import { expectToFail } from '../../utils/utils';
import { ngServe, updateJsonFile, useCIDefaults } from '../../utils/project';

const webpackGoodRegEx = /webpack: Compiled successfully./;
const shouldCompile = () => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 10000);
const shouldNotCompile = () => expectToFail(shouldCompile);

const touch = (fileName: string) => readFile(fileName)
  .then(
    (content: string) => writeFile(fileName, content.concat('console.log(1);')),
    error => writeFile(fileName, 'console.log(1);')
  );

const updateIgnoredConfig = (ignored: string | string[]) => updateJsonFile(
  '.angular-cli.json',
  ({ defaults }) => {
    const { build = {} } = defaults;
    defaults.build = { ...build, ignored };
  }
);

export default function() {
  return Promise.resolve()
    // Can specify an array of  ignored options via the config
    .then(() => updateIgnoredConfig([ '**/*~', '**/.*.sw[pon]' ])
    .then(() => ngServe())
    .then(() => touch('src/main.ts')).then(shouldCompile)
    .then(() => touch('src/main.ts~')).then(shouldNotCompile)
    .then(() => touch('src/.main.ts.swp')).then(shouldNotCompile)
    .then(() => touch('src/.main.ts.swo')).then(shouldNotCompile)
    .then(() => touch('src/.main.ts.swn')).then(shouldNotCompile)
    .then(() => touch('src/main.ts')).then(shouldCompile)
    .then(() => killAllProcesses())

    // Can specify a single ignored option via the config
    .then(() => updateIgnoredConfig('**/*~')
    .then(() => ngServe())
    .then(() => touch('src/main.ts')).then(shouldCompile)
    .then(() => touch('src/main.ts~')).then(shouldNotCompile)
    .then(() => touch('src/.main.ts.swp')).then(shouldCompile)
    .then(() => touch('src/.main.ts.swo')).then(shouldCompile)
    .then(() => touch('src/.main.ts.swn')).then(shouldCompile)
    .then(() => touch('src/main.ts')).then(shouldCompile)
    .then(() => killAllProcesses())

    // Can specify a single ignored option via the command line
    .then(() => useCIDefaults())
    .then(() => ngServe('--ignored', '**/.*.sw[po]'))
    .then(() => touch('src/main.ts')).then(shouldCompile)
    .then(() => touch('src/main.ts~')).then(shouldCompile)
    .then(() => touch('src/.main.ts.swp')).then(shouldNotCompile)
    .then(() => touch('src/.main.ts.swo')).then(shouldNotCompile)
    .then(() => touch('src/.main.ts.swn')).then(shouldCompile)
    .then(() => touch('src/main.ts')).then(shouldCompile)
    .then(() => killAllProcesses())

    // Compiles on every file change by default
    .then(() => useCIDefaults())
    .then(() => ngServe())
    .then(() => touch('src/main.ts')).then(shouldCompile)
    .then(() => touch('src/main.ts~')).then(shouldCompile)
    .then(() => touch('src/.main.ts.swp')).then(shouldCompile)
    .then(() => touch('src/.main.ts.swo')).then(shouldCompile)
    .then(() => touch('src/.main.ts.swn')).then(shouldCompile)
    .then(() => touch('src/main.ts')).then(shouldCompile)
    .then(() => killAllProcesses(), err => { killAllProcesses(); throw err; });
}
