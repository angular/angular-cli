import { readFile, writeFile } from './fs';
import { silentExecAndWaitForOutputToMatch } from './process';


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

export function ngServe(...args: string[]) {
  return silentExecAndWaitForOutputToMatch('ng',
    ['serve', ...args], /webpack: bundle is now VALID/);
}
