import * as fs from 'fs';
import * as nodePath from 'path';
import * as ts from 'typescript';
const glob = require('glob');

const MODULES_PATH = 'modules';
const DIST_PATH = 'dist';
const NPM_PREFIX = 'angular2';

export function getAllModules(): string[] {
  return fs.readdirSync(MODULES_PATH);
}

export function getCompilerOptions(config: TSConfig): ts.CompilerOptions  {
  return ts.convertCompilerOptionsFromJson(config.compilerOptions, __dirname, 'tsconfig.json').options;
}

export function getPublishedModuleNames(allModules: string[]): string[] {
  return allModules.map(name => `${NPM_PREFIX}-${name}`);
}

export function getTargetFiles(testArg: boolean, argModule: string, config: TSConfig): string[] {
  // TODO(gdi2290): filter out build root level typescript
  config.files = config.files.filter(file => !(/gulpfile|build-utils/.test(file)));

  if (testArg && !argModule) {
    return config.files.concat(getAllTestFiles());
  } else if (argModule) {
    return getFilesForModules(argModule, config.files, testArg);
  } else {
    return config.files;
  }
}

export function getRootDependencies(rootPackage: PackageLike, publishedModuleNames: string[]): DepsMap {
  return Object.assign({},
    rootPackage.dependencies,
    rootPackage.devDependencies,
    rootPackage.peerDependencies,
    // Give all native modules the current version in package.json
    publishedModuleNames.reduce((prev, mod) => Object.assign({}, prev, {
      [mod]: `~${rootPackage.version}`
    }), {}));
}

export function buildTs(files, compilerOptions: ts.CompilerOptions) {
  let host = ts.createCompilerHost(compilerOptions);
  let program = ts.createProgram(files, compilerOptions, host);
  program.emit();
}

/**
 * Gets files from tsconfig.json that start with the provided module names.
 */
export function getFilesForModules(mod: string, files: string[], argTest: boolean): string[] {
  return mod.split(',').reduce((prev, m) => {
    let exp = new RegExp(`^(?:${MODULES_PATH}/${m}/|[^${MODULES_PATH}]).*`);
    return prev
      .concat(files.filter(f => exp.test(f)))
      .concat(argTest ? glob.sync(`${nodePath.resolve(MODULES_PATH, m)}/**/*.spec.ts`) : []);
  }, []);
}

export function getAllTestFiles() {
  return glob.sync(`${nodePath.resolve(MODULES_PATH)}/**/*.spec.ts`);
}

export function getRootDependencyVersion(packageNames: string[], rootDependencies: DepsMap): DepsMap {
  return <{[key: string]: string}>packageNames.reduce((prev, depName) => {
    return Object.assign({}, prev, {
      [depName]: rootDependencies[depName]
    });
  }, {});
}

export function addMetadataToPackage(pkg: PackageLike, rootPackage: PackageLike): PackageLike {
  let {contributors, version, homepage, license, repository, bugs, config, engines } = rootPackage;
  return Object.assign({}, pkg, {contributors, version, homepage, license, repository, bugs, config, engines});
}

export function stripSrcFromPath(path) {
  if (/\/src(\/.*|$)/.test(path.dirname)) {
    path.dirname = path.dirname.replace('/src', '');
  }
  return path;
}

export interface PackageLike {
  contributors?: string[];
  engines?: Object;
  homepage?: string;
  license?: string;
  repository?: string;
  bugs?: Object;
  config?: Object;
  version: string;
  main?: string;
  dependencies?: Object;
  devDependencies?: Object;
  peerDependencies?: Object;
}

export interface DepsMap {
  [key: string]: string;
}

export interface TSConfig {
  files: string[];
  compilerOptions: any;
}
