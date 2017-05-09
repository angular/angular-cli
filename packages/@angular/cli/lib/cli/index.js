/*eslint-disable no-console */

// Prevent the dependency validation from tripping because we don't import these. We need
// it as a peer dependency of @angular/core.
// require('zone.js')


// This file hooks up on require calls to transpile TypeScript.
const cli = require('../../ember-cli/lib/cli');
const UI = require('../../ember-cli/lib/ui');
const path = require('path');


module.exports = function(options) {

  // patch UI to not print Ember-CLI warnings (which don't apply to Angular CLI)
  UI.prototype.writeWarnLine = function () { }

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
