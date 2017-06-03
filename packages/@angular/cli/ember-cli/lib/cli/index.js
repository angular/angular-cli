'use strict';
var path          = require('path');

// Main entry point
var Project       = require('../models/project');
var CLI           = require('./cli');
var debug         = require('debug')('ember-cli:cli/index');


// Options: Array cliArgs, Stream inputStream, Stream outputStream
module.exports = function(options) {
  var UI = options.UI || require('../ui');

  // TODO: one UI (lib/models/project.js also has one for now...)
  var ui = new UI({
    inputStream:  options.inputStream,
    outputStream: options.outputStream,
    errorStream:  options.errorStream || process.stderr,
    errorLog:     options.errorLog || [],
    ci:           process.env.CI || /^(dumb|emacs)$/.test(process.env.TERM),
    writeLevel:   ~process.argv.indexOf('--silent') ? 'ERROR' : undefined
  });


  var defaultUpdateCheckerOptions = {
    checkForUpdates: false
  };

  var cli = new CLI({
    ui:        ui,
    testing:   options.testing,
    name: options.cli ? options.cli.name : 'ember',
    disableDependencyChecker: options.disableDependencyChecker,
    root: options.cli ? options.cli.root : path.resolve(__dirname, '..', '..'),
    npmPackage: options.cli ? options.cli.npmPackage : 'ember-cli'
  });

  var project = Project.projectOrnullProject(ui, cli);

  var environment = {
    tasks:    options.tasks || {},
    cliArgs:  options.cliArgs,
    commands: options.commands || {},
    project:  project,
    settings: defaultUpdateCheckerOptions
  };

  return cli.run(environment);
};
