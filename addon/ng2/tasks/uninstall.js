/* jshint node: true, esversion: 6 */
'use strict';

const Promise           = require('ember-cli/lib/ext/promise');
const Task              = require('ember-cli/lib/models/task');
const npmTask           = require('ember-cli/lib/tasks/npm-task');
const chalk             = require('chalk');
const path              = require('path');
const fs                = require('fs');
const fse               = require('fs-extra');
const exec              = Promise.denodeify(require('child_process').exec);
const packageJSON       = path.resolve(process.cwd(), 'package.json');
const nodeModules       = path.resolve(process.cwd(), 'node_modules');
const typingsUninstall  = require('./typings-uninstall');
const systemJS          = require('../utilities/systemjs-helper.ts');

module.exports = Task.extend({
  run: function(options) {
    this.packages = options.packages;
    this.typings = options.typings;

    return this.uninstallProcedure();
  },

  uninstallProcedure: function() {
    const NpmTask = new npmTask({
      command: 'uninstall',
      ui: this.ui,
      analytics: this.analytics,
      project: this.project,
      startProgressMessage: `Uninstalling packages: ${this.packages}`,
      completionMessage: `Packages successfully uninstalled.`
    });

    return NpmTask.run({
      packages: this.packages,
      verbose: false
    })
    .then(() => this.removeFromSystemJSConfig(this.packages))
    .then(() => {
      const typings = this.typings;
      if (typings) {
        this.ui.startProgress(chalk.green(`Uninstalling typings: ${typings}`), chalk.green(`.`));
        return typingsUninstall(typings).then(() => {
          this.ui.stopProgress();
          this.ui.writeLine(chalk.green(`Typings successfully uninstalled.`)); 
        });
      }
    }.bind(this));
  },

  removeFromSystemJSConfig: function(packages) {
    const systemPath = path.resolve(process.cwd(), 'src', 'config', 'system.config.js');

    let json = systemJS.loadSystemJson(systemPath);
    let mappings = json.map || {};
    packages.forEach(pkg => {
      delete mappings[pkg];
    });
    json.map = mappings;
    systemJS.saveSystemJson(systemPath, json);

    return Promise.resolve();
  }

});
