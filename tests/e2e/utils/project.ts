import {readFile, writeFile} from './fs';
import {silentExecAndWaitForOutputToMatch, silentNpm, ng} from './process';
import {getGlobalVariable} from './env';

const packages = require('../../../lib/packages').packages;


const tsConfigPath = 'src/tsconfig.app.json';


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
  const argv: any = getGlobalVariable('argv');

  return Promise.resolve()
    .then(() => process.chdir(getGlobalVariable('tmp-root')))
    .then(() => ng('new', name, '--skip-install', ...args))
    .then(() => process.chdir(name))
    .then(() => updateJsonFile('package.json', json => {
      Object.keys(packages).forEach(pkgName => {
        json['dependencies'][pkgName] = packages[pkgName].dist;
      });
    }))
    .then(() => argv['ng2'] ? useNg2() : Promise.resolve())
    .then(() => {
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

// Convert a Angular 4 project to Angular 2.
export function useNg2() {
  const ng2Deps: any = {
    'dependencies': {
      '@angular/common': '^2.4.0',
      '@angular/compiler': '^2.4.0',
      '@angular/core': '^2.4.0',
      '@angular/forms': '^2.4.0',
      '@angular/http': '^2.4.0',
      '@angular/platform-browser': '^2.4.0',
      '@angular/platform-browser-dynamic': '^2.4.0',
      '@angular/router': '^3.4.0',
      'zone.js': '^0.7.4'
    },
    'devDependencies': {
      '@angular/compiler-cli': '^2.4.0',
      'typescript': '~2.0.0'
    }
  };

  const tsconfigAppJson: any = {
    'compilerOptions': {
      'sourceMap': true,
      'declaration': false,
      'moduleResolution': 'node',
      'emitDecoratorMetadata': true,
      'experimentalDecorators': true,
      'target': 'es5',
      'lib': [
        'es2016',
        'dom'
      ],
      'outDir': '../out-tsc/app',
      'module': 'es2015',
      'baseUrl': '',
      'types': []
    },
    'exclude': [
      'test.ts',
      '**/*.spec.ts'
    ]
  };

  const tsconfigSpecJson: any = {
    'compilerOptions': {
      'sourceMap': true,
      'declaration': false,
      'moduleResolution': 'node',
      'emitDecoratorMetadata': true,
      'experimentalDecorators': true,
      'lib': [
        'es2016',
        'dom'
      ],
      'outDir': '../out-tsc/spec',
      'module': 'commonjs',
      'target': 'es5',
      'baseUrl': '',
      'types': [
        'jasmine',
        'node'
      ]
    },
    'files': [
      'test.ts'
    ],
    'include': [
      '**/*.spec.ts',
      '**/*.d.ts'
    ]
  };

  const tsconfigE2eJson: any = {
    'compilerOptions': {
      'sourceMap': true,
      'declaration': false,
      'moduleResolution': 'node',
      'emitDecoratorMetadata': true,
      'experimentalDecorators': true,
      'lib': [
        'es2016'
      ],
      'outDir': '../out-tsc/e2e',
      'module': 'commonjs',
      'target': 'es5',
      'types': [
        'jasmine',
        'node'
      ]
    }
  };


  return Promise.resolve()
    .then(() => updateJsonFile('package.json', json => {
      Object.keys(ng2Deps['dependencies']).forEach(pkgName => {
        json['dependencies'][pkgName] = ng2Deps['dependencies'][pkgName];
      });
      Object.keys(ng2Deps['devDependencies']).forEach(pkgName => {
        json['devDependencies'][pkgName] = ng2Deps['devDependencies'][pkgName];
      });
      console.log(JSON.stringify(json))
    }))
    .then(() => updateJsonFile('src/tsconfig.app.json', json =>
      Object.assign(json, tsconfigAppJson)))
    .then(() => updateJsonFile('src/tsconfig.spec.json', json =>
      Object.assign(json, tsconfigSpecJson)))
    .then(() => updateJsonFile('e2e/tsconfig.e2e.json', json =>
      Object.assign(json, tsconfigE2eJson)));
}
