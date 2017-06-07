import { ng } from './process';
import { expectFileToExist } from './fs';
import { expectToFail } from "./utils";

export interface TestGenerateParam {
  blueprint: 'class' | 'component' | 'directive' | 'interface' | 'guard' |
    'module' | 'pipe' | 'service';
  name: string;
  flags?: string[];
  pathsToVerify?: string[];
}

export function testGenerate(
    {blueprint, name, flags, pathsToVerify}: TestGenerateParam): Promise<any> {

  flags = flags || [];
  pathsToVerify = pathsToVerify || [];

  return ng('generate', blueprint, name, ...flags)
    .then((output): any => {
      if (pathsToVerify) {
        const existPromises: Promise<any>[] = pathsToVerify
          .filter(path => !path.startsWith('!'))
          .map(expectFileToExist);

        const notExistPromises: Promise<any>[] = pathsToVerify
          .filter(path => path.startsWith('!'))
          .map(path => path.substr(1))
          .map(path => expectToFail(() => expectFileToExist(path)));

        return Promise.all([
          ...existPromises,
          ...notExistPromises
        ])
        .then(() => output);
      } else {
        return output;
      }
    });

}
