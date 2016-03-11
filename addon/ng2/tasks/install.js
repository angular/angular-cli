/* jshint node: true, esnext: true */
'use strict';

const Promise         = require('ember-cli/lib/ext/promise');
const Task            = require('ember-cli/lib/models/task');
const npmTask         = require('ember-cli/lib/tasks/npm-task');
const chalk           = require('chalk');
const path            = require('path');
const fs              = require('fs');
const fse             = require('fs-extra');
const packageJSON     = path.resolve(process.cwd(), 'package.json');
const nodeModules     = path.resolve(process.cwd(), 'node_modules');
const typingsInstall  = require('./typings-install');
const systemJS        = require('../utilities/systemjs-helper.ts');
const ts              = require('typescript');
const glob            = require('glob');
const _               = require('lodash');

module.exports = Task.extend({
  completionOKMessage: 'Successfully installed.',
  completionErrorMessage: 'Error installing package.',

  run: function(options) {
    this.packages = options.packages;
    this.typings = options.typings;

    if (this.packages.indexOf('sass') !== -1) {
      this.packages[this.packages.indexOf('sass')] = 'node-sass';
    }

    if (this.packages.indexOf('compass') !== -1) {
      this.packages[this.packages.indexOf('compass')] = 'compass-importer';
      if (this.packages.indexOf('sass') === -1 || this.packages.indexOf('node-sass')) {
        this.packages.push('node-sass');
      }
    }

    return this.installProcedure();
  },

  installProcedure: function() {
    const NpmTask = new npmTask({
      command: 'install',
      ui: this.ui,
      analytics: this.analytics,
      project: this.project,
      startProgressMessage: `Installing packages: ${this.packages}`,
      completionMessage: `Packages successfully installed.`
    });

    return NpmTask.run({
      packages: this.packages,
      verbose: false,
    })
    .then(() => this.storeInSystemJSConfig(this.packages))
    .then(() => {
      const typings = this.typings;
      if (typings) {
        this.ui.startProgress(chalk.green(`Installing typings: ${typings}`), chalk.green(`.`));
        return typingsInstall(typings).then(() => {
          this.ui.stopProgress();
          this.ui.writeLine(chalk.green(`Typings successfully installed.`)); 
        });
      }
    }.bind(this));
  },

  storeInSystemJSConfig: function(packages) {
    const systemPath = path.resolve(process.cwd(), 'src', 'config', 'system.config.js');
    let json = systemJS.loadSystemJson(systemPath);

    let mappings = json.map || {};
    packages.forEach(pkg => {
      mappings[pkg] = `libs/${pkg}/${pkg}.js`;
    });
    json.map = mappings;
    systemJS.saveSystemJson(systemPath, json);
    
    return Promise.resolve();
  }

});
