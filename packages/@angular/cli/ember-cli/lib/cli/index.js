'use strict';

// Main entry point
const path = require('path');

// ember-cli and user apps have many dependencies, many of which require
// process.addListener('exit', ....) for cleanup, by default this limit for
// such listeners is 10, recently users have been increasing this and not to
// their fault, rather they are including large and more diverse sets of
// node_modules.
//
// https://github.com/babel/ember-cli-babel/issues/76
process.setMaxListeners(1000);

// Options: Array cliArgs, Stream inputStream, Stream outputStream
module.exports = function(options) {
  const CLI = require('./cli');
  const Project = require('../models/project');

  let cli = new CLI({
    testing: options.testing,
    name: options.cli ? options.cli.name : 'ember',
    root: options.cli ? options.cli.root : path.resolve(__dirname, '..', '..'),
    npmPackage: options.cli ? options.cli.npmPackage : 'ember-cli',
  });

  let project = Project.projectOrnullProject(undefined, cli);

  let environment = {
    tasks: options.tasks || {},
    cliArgs: options.cliArgs,
    commands: options.commands || {},
    project,
  };

  return cli.run(environment);
};
