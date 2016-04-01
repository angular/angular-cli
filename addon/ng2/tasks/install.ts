import * as Task from 'ember-cli/lib/models/task';
import * as npmTask from 'ember-cli/lib/tasks/npm-task';
import * as chalk from 'chalk';
import * as path from 'path';
import { EventEmitter } from 'events';
import * as search from 'typings-core/dist/search';
import * as typings from 'typings-core/dist/install';
import * as systemJS from '../utilities/systemjs-helper';

module.exports = Task.extend({
  completionOKMessage: 'Successfully installed.',
  completionErrorMessage: 'Error installing package.',

  run: function(options) {
    this.packages = options.packages;

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
    const that = this;

    const NpmTask = new npmTask({
      command: 'install',
      ui: this.ui,
      analytics: this.analytics,
      project: this.project,
      startProgressMessage: 'Installing packages: ' + this.packages,
      completionMessage: 'Packages successfully installed.'
    });

    return NpmTask.run({
      packages: this.packages,
      verbose: false
    })
    .then(() => this.storeInSystemJSConfig(this.packages))
    .then(() => this.installTypings());
  },

  installTypings: function() {
    this.ui.startProgress(chalk.green('Searching and installing typings'), chalk.green('.'));
    this.packages = this.packages.filter(p => !/node-sass|stylus|less|compass-importer/.test(p));

    let typingsList = [];

    return Promise.all(this.packages.map(p => {
      return new Promise(res => {
        search.search({ name: p }).then(resp => {
          if (resp.results.length) {
            let names = resp.results.map(x => {
              if (x.source === 'dt') { return x.name; }
            }).filter(x => !!x);
            typingsList = typingsList.concat(names);
          }
          res();
        });
      });
    }))
    .then(() => {
      return Promise.all(typingsList.map(t => {
        return new Promise(res => {
          let installOpts = { cwd: process.env.PWD, save: true, ambient: true };
          typings.installDependencyRaw(t, installOpts).then(() => { res(); });
        });
      }))
      .then(() => {
        return this.ui.stopProgress();
      })
    });
  },

  storeInSystemJSConfig: function(packages) {
    const systemPath = path.resolve(process.cwd(), 'src', 'config', 'system.config.js');
    let json = systemJS.loadSystemJson(systemPath);

    packages = packages.filter(p => {
      return (!/node-sass|stylus|less|compass-importer/.test(p));
    });

    let mappings = json.map || {};
    packages.forEach(pkg => {
      mappings[pkg] = 'libs/' + pkg + '/' + pkg + '.js';
    });
    json.map = mappings;
    systemJS.saveSystemJson(systemPath, json);
    
    return Promise.resolve();
  }

});
