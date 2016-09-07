import {readFile, writeFile} from './fs';
import {git, execAndWaitForOutputToMatch} from './process';

const tsConfigPath = 'src/tsconfig.json';


export function updateJsonFile(filePath: string, fn: (json: any) => any | void) {
  return readFile(filePath)
    .then(tsConfigJson => {
      const tsConfig = JSON.parse(tsConfigJson);
      const result = fn(tsConfig) || tsConfig;

      return writeFile(filePath, JSON.stringify(result, null, 2));
    });
}


export function updateTsConfig(fn: (json: any) => any | void) {
  return updateJsonFile(tsConfigPath, fn);
}


export function gitCommit(message: string) {
  return git('add', '-A')
    .then(() => git('commit', '-am', message));
}


export function ngServe(...args: string[]) {
  return execAndWaitForOutputToMatch('ng', ['serve', ...args], /webpack: bundle is now VALID/);
}
