import {readFile, writeFile} from './fs';
import {silentExecAndWaitForOutputToMatch, silentNpm, ng} from './process';
import {getGlobalVariable} from './env';

const packages = require('../../../lib/packages');


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


export function createProject(name: string, ...args: string[]) {
  return Promise.resolve()
    .then(() => process.chdir(getGlobalVariable('tmp-root')))
    .then(() => ng('new', name, '--skip-npm', ...args))
    .then(() => process.chdir(name))
    .then(() => updateJsonFile('package.json', json => {
      Object.keys(packages).forEach(pkgName => {
        json['dependencies'][pkgName] = packages[pkgName].dist;
      });
    }))
    .then(() => {
      const argv: any = getGlobalVariable('argv');
      if (argv.nightly) {
        return updateJsonFile('package.json', json => {
          // Install over the project with nightly builds.
          const angularPackages = [
            'core',
            'common',
            'compiler',
            'forms',
            'http',
            'router',
            'platform-browser',
            'platform-browser-dynamic'
          ];
          angularPackages.forEach(pkgName => {
            json['dependencies'][`@angular/${pkgName}`] = `github:angular/${pkgName}-builds`;
          });
        });
      }
    })
    .then(() => console.log(`Project ${name} created... Installing npm.`))
    .then(() => silentNpm('install'));
}
