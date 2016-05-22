'use strict';

const Promise = require('ember-cli/lib/ext/promise');
const Task = require('ember-cli/lib/models/task');
const exec = require('child_process').exec;
const chalk = require('chalk');

module.exports = Task.extend({
  run: function (options) {
    options = options || {};

    var ui = this.ui;
    const execPromise = Promise.denodeify(exec);

    return getDockerVersion()
      .then(getDockerComposeVersion)
      .then(getDockerMachineVersion);

    function getDockerVersion() {
      return execPromise('docker --version')
        .then((stdout) => {
          var matches = stdout.match(/Docker version (.+?), build (.+)/);
          if (!matches) {
            return Promise.reject(new Error('Unknown Docker CLI output'));
          }
          if (options.verbose) {
            ui.writeLine(chalk.green(
              'found docker version ' + matches[1] + '/' + matches[2]
            ));
          }
        })
        .catch(() => Promise.reject(new Error(
          'The docker CLI must be installed to use this feature.'
        )));
    }

    function getDockerComposeVersion() {
      return execPromise('docker-compose --version')
        .then((stdout) => {
          var matches = stdout.match(/docker-compose version (.+?), build (.+)/);
          if (!matches) {
            return Promise.reject(new Error('Unknown docker-compose CLI output'));
          }
          if (options.verbose) {
            ui.writeLine(chalk.green(
              'found docker-compose version ' + matches[1] + '/' + matches[2])
            );
          }
        })
        .catch(() => Promise.reject(new Error(
          'The docker-compose CLI must be installed to use this feature.'
        )));
    }

    function getDockerMachineVersion() {
      return execPromise('docker-machine --version')
        .then((stdout) => {
          var matches = stdout.match(/docker-machine version (.+?), build (.+)/);
          if (!matches) {
            return Promise.reject(new Error('Unknown docker-machine CLI output'));
          }
          if (options.verbose) {
            ui.writeLine(chalk.green(
              'found docker-machine version ' + matches[1] + '/' + matches[2])
            );
          }
        })
        .catch(() => Promise.reject(new Error(
          'The docker-machine CLI must be installed to use this feature.'
        )));
    }
  }
});
