/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');


Error.stackTraceLimit = Infinity;

global._SdkIsLocal = true;
global._SdkRoot = path.resolve(__dirname, '..');
global._SdkPackages = require('./packages').packages;
global._SdkTools = require('./packages').tools;

global._SdkRequireHook = null;


const compilerOptions = ts.readConfigFile(path.join(__dirname, '../tsconfig.json'), p => {
  return fs.readFileSync(p, 'utf-8');
}).config;


const oldRequireTs = require.extensions['.ts'];
require.extensions['.ts'] = function (m, filename) {
  // If we're in node module, either call the old hook or simply compile the
  // file without transpilation. We do not touch node_modules/**.
  // We do touch `Angular SDK` files anywhere though.
  if (!filename.match(/@angular\/cli\b/) && filename.match(/node_modules/)) {
    if (oldRequireTs) {
      return oldRequireTs(m, filename);
    }
    return m._compile(fs.readFileSync(filename), filename);
  }

  // Node requires all require hooks to be sync.
  const source = fs.readFileSync(filename).toString();

  try {
    let result = ts.transpile(source, compilerOptions['compilerOptions'], filename);

    if (global._SdkRequireHook) {
      result = global._SdkRequireHook(result, filename);
    }

    // Send it to node to execute.
    return m._compile(result, filename);
  } catch (err) {
    console.error('Error while running script "' + filename + '":');
    console.error(err.stack);
    throw err;
  }
};


// If we're running locally, meaning npm linked. This is basically "developer mode".
if (!__dirname.match(new RegExp(`\\${path.sep}node_modules\\${path.sep}`))) {
  const packages = require('./packages').packages;

  // We mock the module loader so that we can fake our packages when running locally.
  const Module = require('module');
  const oldLoad = Module._load;
  const oldResolve = Module._resolveFilename;

  Module._resolveFilename = function (request, parent) {
    if (request in packages) {
      return packages[request].main;
    } else if (request.startsWith('@angular/cli/')) {
      // We allow deep imports (for now).
      // TODO: move tests to inside @angular/cli package so they don't have to deep import.
      const dir = path.dirname(parent.filename);
      return path.relative(dir, path.join(__dirname, '../packages', request));
    } else {
      let match = Object.keys(packages).find(pkgName => request.startsWith(pkgName + '/'));
      if (match) {
        const p = path.join(packages[match].root, request.substr(match.length));
        return oldResolve.call(this, p, parent);
      } else {
        return oldResolve.apply(this, arguments);
      }
    }
  };
}
