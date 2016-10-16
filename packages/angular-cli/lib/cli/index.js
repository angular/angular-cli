/*eslint-disable no-console */

// This file hooks up on require calls to transpile TypeScript.
const cli = require('ember-cli/lib/cli');
const path = require('path');

Error.stackTraceLimit = Infinity;

module.exports = function(options) {
  const oldStdoutWrite = process.stdout.write;
  process.stdout.write = function (line) {
    line = line.toString();
    if (line.match(/version:|WARNING:/)) {
      return;
    }
    if (line.match(/ember-cli-(inject-)?live-reload/)) {
      // don't replace 'ember-cli-live-reload' on ng init diffs
      return oldStdoutWrite.apply(process.stdout, arguments);
    }
    line = line.replace(/ember-cli(?!.com)/g, 'angular-cli')
      .replace(/\bember\b(?!-cli.com)/g, 'ng');
    return oldStdoutWrite.apply(process.stdout, arguments);
  };

  const oldStderrWrite = process.stderr.write;
  process.stderr.write = function (line) {
    line = line.toString()
      .replace(/ember-cli(?!.com)/g, 'angular-cli')
      .replace(/\bember\b(?!-cli.com)/g, 'ng');
    return oldStderrWrite.apply(process.stdout, arguments);
  };

  options.cli = {
    name: 'ng',
    root: path.join(__dirname, '..', '..'),
    npmPackage: 'angular-cli'
  };

  // ensure the environemnt variable for dynamic paths
  process.env.PWD = process.env.PWD || process.cwd();


  process.env.CLI_ROOT = process.env.CLI_ROOT || path.resolve(__dirname, '..', '..');

  return cli(options);
};
