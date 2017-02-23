/*eslint-disable no-console */

// Prevent the dependency validation from tripping because we don't import these. We need
// it as a peer dependency of @angular/core.
// require('zone.js')
// require('@angular/tsc-wrapped')


// This file hooks up on require calls to transpile TypeScript.
const cli = require('../../ember-cli/lib/cli');
const UI = require('../../ember-cli/lib/ui');
const Watcher = require('../../ember-cli/lib/models/watcher');
const path = require('path');

Error.stackTraceLimit = Infinity;

module.exports = function(options) {

  // patch UI to not print Ember-CLI warnings (which don't apply to Angular CLI)
  UI.prototype.writeWarnLine = function () { }

  // patch Watcher to always default to node, not checking for Watchman
  Watcher.detectWatcher = function(ui, _options){
    var options = _options || {};
    options.watcher = 'node';
    return Promise.resolve(options);
  }

  options.cli = {
    name: 'ng',
    root: path.join(__dirname, '..', '..'),
    npmPackage: '@angular/cli'
  };

  // ensure the environemnt variable for dynamic paths
  process.env.PWD = path.normalize(process.env.PWD || process.cwd());
  process.env.CLI_ROOT = process.env.CLI_ROOT || path.resolve(__dirname, '..', '..');

  return cli(options);
};
