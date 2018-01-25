/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');


let _istanbulRequireHook = null;
if (process.env['CODE_COVERAGE'] || process.argv.indexOf('--code-coverage') !== -1) {
  _istanbulRequireHook = require('./istanbul-local').istanbulRequireHook;
}


// Check if we need to profile this CLI run.
let profiler = null;
if (process.env['DEVKIT_PROFILING']) {
  profiler = require('v8-profiler');
  profiler.startProfiling();

  function exitHandler(options, _err) {
    if (options.cleanup) {
      const cpuProfile = profiler.stopProfiling();
      const profileData = JSON.stringify(cpuProfile);
      const filePath = path.resolve(process.cwd(), process.env.DEVKIT_PROFILING) + '.cpuprofile';

      console.log(`Profiling data saved in "${filePath}": ${profileData.length} bytes`);
      fs.writeFileSync(filePath, profileData);
    }

    if (options.exit) {
      process.exit();
    }
  }

  process.on('exit', exitHandler.bind(null, { cleanup: true }));
  process.on('SIGINT', exitHandler.bind(null, { exit: true }));
  process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
}


Error.stackTraceLimit = Infinity;

global._DevKitIsLocal = true;
global._DevKitRoot = path.resolve(__dirname, '..');


const compilerOptions = ts.readConfigFile(path.join(__dirname, '../tsconfig.json'), p => {
  return fs.readFileSync(p, 'utf-8');
}).config;


const oldRequireTs = require.extensions['.ts'];
require.extensions['.ts'] = function (m, filename) {
  // If we're in node module, either call the old hook or simply compile the
  // file without transpilation. We do not touch node_modules/**.
  // We do touch `Angular DevK` files anywhere though.
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

    if (_istanbulRequireHook) {
      result = _istanbulRequireHook(result, filename);
    }

    // Send it to node to execute.
    return m._compile(result, filename);
  } catch (err) {
    console.error('Error while running script "' + filename + '":');
    console.error(err.stack);
    throw err;
  }
};


require.extensions['.ejs'] = function (m, filename) {
  const source = fs.readFileSync(filename).toString();
  const template = require('@angular-devkit/core').template;
  const result = template(source, { sourceURL: filename, sourceMap: true });

  return m._compile(result.source.replace(/return/, 'module.exports.default = '), filename);
};

const builtinModules = Object.keys(process.binding('natives'));
const packages = require('./packages').packages;
// If we're running locally, meaning npm linked. This is basically "developer mode".
if (!__dirname.match(new RegExp(`\\${path.sep}node_modules\\${path.sep}`))) {

  // We mock the module loader so that we can fake our packages when running locally.
  const Module = require('module');
  const oldLoad = Module._load;
  const oldResolve = Module._resolveFilename;

  Module._resolveFilename = function (request, parent) {
    if (request in packages) {
      return packages[request].main;
    } else if (builtinModules.includes(request)) {
      // It's a native Node module.
      return oldResolve.call(this, request, parent);
    } else {
      const match = Object.keys(packages).find(pkgName => request.startsWith(pkgName + '/'));
      if (match) {
        const p = path.join(packages[match].root, request.substr(match.length));
        return oldResolve.call(this, p, parent);
      } else {
        return oldResolve.apply(this, arguments);
      }
    }
  };
}


// Set the resolve hook to allow resolution of packages from a local dev environment.
require('@angular-devkit/core/node/resolve').setResolveHook(function(request, options) {
  try {
    if (request in packages) {
      if (options.resolvePackageJson) {
        return path.join(packages[request].root, 'package.json');
      } else {
        return packages[request].main;
      }
    } else {
      const match = Object.keys(packages).find(function(pkgName) {
        return request.startsWith(pkgName + '/');
      });

      if (match) {
        return path.join(packages[match].root, request.substr(match[0].length));
      } else {
        return null;
      }
    }
  } catch (_) {
    return null;
  }
});
