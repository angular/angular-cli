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
    ['serve', '--no-progress', ...args],
    /webpack: bundle is now VALID|webpack: Compiled successfully./);
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
      if (argv.nightly || argv['ng-sha']) {
        const label = argv['ng-sha'] ? `#2.0.0-${argv['ng-sha']}` : '';
        return updateJsonFile('package.json', json => {
          // Install over the project with nightly builds.
          Object.keys(json['dependencies'] || {})
            .filter(name => name.match(/^@angular\//))
            .forEach(name => {
              const pkgName = name.split(/\//)[1];
              if (pkgName == 'cli') {
                return;
              }
              json['dependencies'][`@angular/${pkgName}`]
                = `github:angular/${pkgName}-builds${label}`;
            });

          Object.keys(json['devDependencies'] || {})
            .filter(name => name.match(/^@angular\//))
            .forEach(name => {
              const pkgName = name.split(/\//)[1];
              if (pkgName == 'cli') {
                return;
              }
              json['devDependencies'][`@angular/${pkgName}`]
                = `github:angular/${pkgName}-builds${label}`;
            });
        });
      }
    })
    .then(() => console.log(`Project ${name} created... Installing npm.`))
    .then(() => silentNpm('install'));
}
