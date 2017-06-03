/*eslint-disable no-console */

// Prevent the dependency validation from tripping because we don't import these. We need
// it as a peer dependency of @angular/core.
// require('zone.js')


// This file hooks up on require calls to transpile TypeScript.
const cli = require('../../ember-cli/lib/cli');
const UI = require('../../ember-cli/lib/ui');
const path = require('path');

function loadCommands() {
  return {
    'build': require('../../commands/build').default,
    'serve': require('../../commands/serve').default,
    'eject': require('../../commands/eject').default,
    'new': require('../../commands/new').default,
    'generate': require('../../commands/generate').default,
    'destroy': require('../../commands/destroy').default,
    'test': require('../../commands/test').default,
    'e2e': require('../../commands/e2e').default,
    'help': require('../../commands/help').default,
    'lint': require('../../commands/lint').default,
    'version': require('../../commands/version').default,
    'completion': require('../../commands/completion').default,
    'doc': require('../../commands/doc').default,
    'xi18n': require('../../commands/xi18n').default,

    // Easter eggs.
    'make-this-awesome': require('../../commands/easter-egg').default,

    // Configuration.
    'set': require('../../commands/set').default,
    'get': require('../../commands/get').default
  };
}

module.exports = function(options) {

  // patch UI to not print Ember-CLI warnings (which don't apply to Angular CLI)
  UI.prototype.writeWarnLine = function () { }

  options.cli = {
    name: 'ng',
    root: path.join(__dirname, '..', '..'),
    npmPackage: '@angular/cli'
  };

  options.commands = loadCommands();

  // ensure the environemnt variable for dynamic paths
  process.env.PWD = path.normalize(process.env.PWD || process.cwd());
  process.env.CLI_ROOT = process.env.CLI_ROOT || path.resolve(__dirname, '..', '..');

  return cli(options);
};
