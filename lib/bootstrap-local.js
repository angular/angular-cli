/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/* eslint-disable no-console */
'use strict';
const debug = require('debug');
const debugLocal = debug('ng:local');
const debugBuildEjs = debug('ng:local:build:ejs');
const debugBuildSchema = debug('ng:local:build:schema');
const debugBuildTs = debug('ng:local:build:ts');

const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const temp = require('temp');
const ts = require('typescript');

const tmpRoot = temp.mkdirSync('angular-devkit-');

debugLocal('starting bootstrap local');

// This processes any extended configs
const compilerOptions = ts.getParsedCommandLineOfConfigFile(
  path.join(__dirname, '../tsconfig-test.json'),
  { },
  ts.sys,
).options;

// Check if we need to profile this CLI run.
let profiler = null;
if (process.env['DEVKIT_PROFILING']) {
  debugLocal('setup profiling');
  try {
    profiler = require('v8-profiler-node8');
  } catch (err) {
    throw new Error(`Could not require 'v8-profiler-node8'. You must install it separetely with` +
      `'npm install v8-profiler-node8 --no-save.\n\nOriginal error:\n\n${err}`);
  }

  profiler.startProfiling();

  function exitHandler(options, _err) {
    if (options.cleanup) {
      const cpuProfile = profiler.stopProfiling();
      const profileData = JSON.stringify(cpuProfile);
      const filePath = path.resolve(process.cwd(), process.env.DEVKIT_PROFILING) + '.cpuprofile';

      debugLocal('saving profiling data');
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

if (process.env['DEVKIT_LONG_STACK_TRACE']) {
  debugLocal('setup long stack trace');
  Error.stackTraceLimit = Infinity;
}

global._DevKitIsLocal = true;
global._DevKitRoot = path.resolve(__dirname, '..');


const oldRequireTs = require.extensions['.ts'];
require.extensions['.ts'] = function (m, filename) {
  // If we're in node module, either call the old hook or simply compile the
  // file without transpilation. We do not touch node_modules/**.
  // To account for Yarn workspaces symlinks, we much check the real path.
  if (fs.realpathSync(filename).match(/node_modules/)) {
    if (oldRequireTs) {
      return oldRequireTs(m, filename);
    }
    return m._compile(fs.readFileSync(filename).toString(), filename);
  }

  debugBuildTs(filename);

  // Node requires all require hooks to be sync.
  const source = fs.readFileSync(filename).toString();

  try {
    let result = ts.transpile(source, compilerOptions, filename);

    debugBuildTs('done');

    // Send it to node to execute.
    return m._compile(result, filename);
  } catch (err) {
    console.error('Error while running script "' + filename + '":');
    console.error(err.stack);
    throw err;
  }
};


require.extensions['.ejs'] = function (m, filename) {
  debugBuildEjs(filename);

  const source = fs.readFileSync(filename).toString();
  const template = require('@angular-devkit/core').template;
  const result = template(source, { sourceURL: filename, sourceMap: true });

  debugBuildEjs('done');
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
    let resolved = null;
    let exception;
    try {
      resolved = oldResolve.call(this, request, parent);
    } catch (e) {
      exception = e;
    }

    if (request in packages) {
      return packages[request].main;
    } else if (builtinModules.includes(request)) {
      // It's a native Node module.
      return oldResolve.call(this, request, parent);
    } else if (resolved && resolved.match(/[\\\/]node_modules[\\\/]/)) {
      return resolved;
    } else {
      const match = Object.keys(packages).find(pkgName => request.startsWith(pkgName + '/'));
      if (match) {
        const p = path.join(packages[match].root, request.substr(match.length));
        return oldResolve.call(this, p, parent);
      } else if (!resolved) {
        if (exception) {
          throw exception;
        } else {
          return resolved;
        }
      } else {
        // Because loading `.ts` ends up AFTER `.json` in the require() logic, requiring a file that has both `.json`
        // and `.ts` versions will only get the `.json` content (which wouldn't happen if the .ts was compiled to
        // JavaScript). We load `.ts` files first here to avoid this conflict. It's hacky, but so is the rest of this
        // file.
        const maybeTsPath = resolved.endsWith('.json') && resolved.replace(/\.json$/, '.ts');
        if (maybeTsPath && !request.endsWith('.json')) {
          // If the file exists, return its path. If it doesn't, run the quicktype runner on it and return the content.
          if (fs.existsSync(maybeTsPath)) {
            return maybeTsPath;
          } else {
            debugBuildSchema('%s', resolved);

            // This script has the be synchronous, so we spawnSync instead of, say, requiring the runner and calling
            // the method directly.
            const tmpJsonSchemaPath = path.join(tmpRoot, maybeTsPath.replace(/[^0-9a-zA-Z.]/g, '_'));
            try {
              if (!fs.existsSync(tmpJsonSchemaPath)) {
                const quicktypeRunnerPath = path.join(__dirname, '../tools/quicktype_runner.js');
                child_process.spawnSync('node', [quicktypeRunnerPath, resolved, tmpJsonSchemaPath]);
              }

              debugBuildSchema('done');
              return tmpJsonSchemaPath;
            } catch (_) {
              // Just return resolvedPath and let Node deals with it.
              console.log(_);
              process.exit(99);
            }
          }
        }

        return resolved;
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
