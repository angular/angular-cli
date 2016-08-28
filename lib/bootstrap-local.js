/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');


const compilerOptions = JSON.parse(fs.readFileSync(path.join(__dirname, '../tsconfig.json')));

const oldRequireTs = require.extensions['.ts'];
require.extensions['.ts'] = function(m, filename) {
  // If we're in node module, either call the old hook or simply compile the
  // file without transpilation. We do not touch node_modules/**.
  // We do touch `angular-cli` files anywhere though.
  if (!filename.match(/angular-cli/) && filename.match(/node_modules/)) {
    if (oldRequireTs) {
      return oldRequireTs(m, filename);
    }
    return m._compile(fs.readFileSync(filename), filename);
  }

  // Node requires all require hooks to be sync.
  const source = fs.readFileSync(filename).toString();

  try {
    const result = ts.transpile(source, compilerOptions);

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

// If we're running locally, meaning npm linked. This is basically "developer mode".
if (!__dirname.match(/\/node_modules\//)) {
  const packages = require('./packages');

  // We mock the module loader so that we can fake our packages when running locally.
  const Module = require('module');
  const oldLoad = Module._load;
  Module._load = function (request, parent) {
    if (request in packages) {
      return oldLoad.call(this, packages[request].main, parent);
    } else {
      return oldLoad.apply(this, arguments);
    }
  };
}
