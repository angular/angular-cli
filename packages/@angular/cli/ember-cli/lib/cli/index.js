'use strict';

// Main entry point
let logger = require('heimdalljs-logger')('ember-cli:cli/index');
const path = require('path');
const heimdall = require('heimdalljs');

// ember-cli and user apps have many dependencies, many of which require
// process.addListener('exit', ....) for cleanup, by default this limit for
// such listeners is 10, recently users have been increasing this and not to
// their fault, rather they are including large and more diverse sets of
// node_modules.
//
// https://github.com/babel/ember-cli-babel/issues/76
process.setMaxListeners(1000);

function configureLogger(env) {
  let depth = Number(env['DEBUG_DEPTH']);
  if (depth) {
    let logConfig = require('heimdalljs').configFor('logging');
    logConfig.depth = depth;
  }
}

// Options: Array cliArgs, Stream inputStream, Stream outputStream
module.exports = function(options) {
  let UI = options.UI || require('../ui');
  const CLI = require('./cli');
  const Project = require('../models/project');

  configureLogger(process.env);

  // TODO: one UI (lib/models/project.js also has one for now...)
  let ui = new UI({
    inputStream: options.inputStream,
    outputStream: options.outputStream,
    errorStream: options.errorStream || process.stderr,
    errorLog: options.errorLog || [],
    ci: process.env.CI || (/^(dumb|emacs)$/).test(process.env.TERM),
    writeLevel: (process.argv.indexOf('--silent') !== -1) ? 'ERROR' : undefined,
  });


  let defaultUpdateCheckerOptions = {
    checkForUpdates: false,
  };

  let cli = new CLI({
    ui,
    testing: options.testing,
    name: options.cli ? options.cli.name : 'ember',
    disableDependencyChecker: options.disableDependencyChecker,
    root: options.cli ? options.cli.root : path.resolve(__dirname, '..', '..'),
    npmPackage: options.cli ? options.cli.npmPackage : 'ember-cli',
  });

  let project = Project.projectOrnullProject(ui, cli);

  let environment = {
    tasks: options.tasks || {},
    cliArgs: options.cliArgs,
    commands: options.commands || {},
    project,
    settings: defaultUpdateCheckerOptions,
  };

  return cli.run(environment);
};
