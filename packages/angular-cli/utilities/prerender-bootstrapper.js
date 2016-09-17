/* global Zone */
/**
 * This script is meant to be run in a child_process to give fresh
 * context to universal (mostly to avoid conflicting angular versions, and stale module caches).
 * It can be invoked directly, with absolute paths passed as positional args:
 * $ node prerender-bootstrapper.js <project-base-path> <template-path> <app-shell-config-path>
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const projectRoot = process.argv[2];
const templatePath = process.argv[3];
const appShellConfig = process.argv[4];
const projectNodeModulesDir = path.resolve(projectRoot, '../node_modules');

// Require from absolute path to prevent looking up inside of angular-cli
require(`${projectNodeModulesDir}/angular2-universal-polyfills`);
const universal = require(`${projectNodeModulesDir}/angular2-universal`);

// Manually transpile the TS sources to a temp directory
const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
const compilerOptions = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'));

const tmpDir = fs.mkdtempSync('/tmp/cli-app-shell');
const parsedCompilerOpts = ts.convertCompilerOptionsFromJson(Object.assign({}, compilerOptions['compilerOptions'], {
  module: 'commonjs',
  outDir: tmpDir
}));
const tsProgram = ts.createProgram([appShellConfig], parsedCompilerOpts.options);
tsProgram.emit();

// Symlink temp directory node_modules to project's node_modules
fs.symlinkSync(path.join(projectRoot, '../node_modules/'), path.join(tmpDir, 'node_modules'), 'dir');

// Path to tmp-dir/main-app-shell.js
const pathToTranspiledConfig = path.resolve(tmpDir, path.relative(projectRoot, appShellConfig).replace(/\.ts$/, '.js'));

var platformRef =  universal.platformUniversalDynamic();

var platformConfig = {
  ngModule: require(pathToTranspiledConfig).Module,
  document: fs.readFileSync(templatePath, 'utf-8'),
  preboot: false,
  baseUrl: '/',
  requestUrl: '/',
  originUrl: 'localhost:3000'
};


const zone = Zone.current.fork({
  name: 'UNIVERSAL prerender',
  properties: platformConfig
});
zone.run(() => (platformRef.serializeModule(platformConfig.ngModule, platformConfig))
  .then((html) => {
    process.stdout.write(html);
  }, (err) => {
    process.stderr.write(err);
  }));
