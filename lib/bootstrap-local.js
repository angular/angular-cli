/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');


Error.stackTraceLimit = Infinity;

global.angularCliIsLocal = true;
global.angularCliPackages = require('./packages').packages;

const compilerOptions = JSON.parse(fs.readFileSync(path.join(__dirname, '../tsconfig.json')));

const oldRequireTs = require.extensions['.ts'];
require.extensions['.ts'] = function (m, filename) {
  // If we're in node module, either call the old hook or simply compile the
  // file without transpilation. We do not touch node_modules/**.
  // We do touch `Angular CLI` files anywhere though.
  if (!filename.match(/@angular\/cli/) && filename.match(/node_modules/)) {
    if (oldRequireTs) {
      return oldRequireTs(m, filename);
    }
    return m._compile(fs.readFileSync(filename), filename);
  }

  // Node requires all require hooks to be sync.
  const source = fs.readFileSync(filename).toString();

  try {
    const result = ts.transpile(source, compilerOptions['compilerOptions']);

    // Send it to node to execute.
    return m._compile(result, filename);
  } catch (err) {
    console.error('Error while running script "' + filename + '":');
    console.error(err.stack);
    throw err;
  }
};

//
// require('ts-node').register({
//   project: path.dirname(__dirname),
//   lazy: true
// });

const resolve = require('resolve');

const builtinModules = Object.keys(process.binding('natives'));

// Look if there's a .angular-cli.json file, and if so toggle process.cwd() resolution.
const isAngularProject = fs.existsSync(path.join(process.cwd(), '.angular-cli.json'))
                      || fs.existsSync(path.join(process.cwd(), 'angular-cli.json'));


// If we're running locally, meaning npm linked. This is basically "developer mode".
if (!__dirname.match(new RegExp(`\\${path.sep}node_modules\\${path.sep}`))) {
  const packages = require('./packages').packages;

  // We mock the module loader so that we can fake our packages when running locally.
  const Module = require('module');
  const oldLoad = Module._load;
  Module._load = function (request, parent) {
    if (request.match(/ts-node/) && parent && parent.id && parent.id.match(/karma/)) {
      throw new Error();
    }
    if (request in packages) {
      return oldLoad.call(this, packages[request].main, parent);
    } else if (request.startsWith('@angular/cli/')) {
      // We allow deep imports (for now).
      // TODO: move tests to inside @angular/cli package so they don't have to deep import.
      const dir = path.dirname(parent.filename);
      const newRequest = path.relative(dir, path.join(__dirname, '../packages', request));
      return oldLoad.call(this, newRequest, parent);
    } else {
      let match = Object.keys(packages).find(pkgName => request.startsWith(pkgName + '/'));
      if (match) {
        const p = path.join(packages[match].root, request.substr(match.length));
        return oldLoad.call(this, p, parent);
      } else {
        if (!builtinModules.includes(request)) {
          try {
            if (isAngularProject) {
              return oldLoad.call(this, resolve.sync(request, { basedir: process.cwd() }), parent);
            }
          } catch (e) {
            // Do nothing. Fallback to the old method.
          }
        }

        return oldLoad.apply(this, arguments);
      }
    }
  };
}
