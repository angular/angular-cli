/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const ts = require('typescript');
const old = require.extensions['.ts'];

require.extensions['.ts'] = function(m, filename) {
  if (!filename.match(/angular-cli/) && filename.match(/node_modules/)) {
    if (old) {
      return old(m, filename);
    }
    return m._compile(fs.readFileSync(filename), filename);
  }

  const source = fs.readFileSync(filename).toString();

  try {
    const result = ts.transpile(source, {
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.CommonJs
    });

    // Send it to node to execute.
    return m._compile(result, filename);
  } catch (err) {
    console.error('Error while running script "' + filename + '":');
    console.error(err.stack);
    throw err;
  }
};

var Mocha = require('mocha');
var glob = require('glob');
var path = require('path');

var root = 'tests/{acceptance,models,e2e}';
var specFiles = glob.sync(root + '/**/*.spec.*');
var mocha = new Mocha({ timeout: 5000, reporter: 'spec' });

process.env.CLI_ROOT = process.env.CLI_ROOT || path.resolve(__dirname, '..');

specFiles.forEach(mocha.addFile.bind(mocha));

mocha.run(function (failures) {
  process.on('exit', function () {
    process.exit(failures);
  });
});
