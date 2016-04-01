import * as Task from 'ember-cli/lib/models/task';
import * as npmTask from 'ember-cli/lib/tasks/npm-task';
import * as chalk from 'chalk';
import * as path from 'path';
import * as search from 'typings-core/dist/search';
import * as typings from 'typings-core/dist/uninstall';
import * as systemJS from '../utilities/systemjs-helper';

module.exports = Task.extend({
  run: function(options) {
    this.packages = options.packages;

    return this.uninstallProcedure();
  },

  uninstallProcedure: function() {
    const that = this;

    const NpmTask = new npmTask({
      command: 'uninstall',
      ui: this.ui,
      analytics: this.analytics,
      project: this.project,
      startProgressMessage: 'Uninstalling packages: ' + this.packages,
      completionMessage: 'Packages successfully uninstalled.'
    });

    return NpmTask.run({
      packages: this.packages,
      verbose: false
    })
    .then(() => this.removeFromSystemJSConfig(this.packages))
    .then(() => this.uninstallTypings());
  },

  uninstallTypings: function() {
    this.ui.startProgress(chalk.green('Uninstalling typings'), chalk.green('.'));
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
          typings.uninstallDependency(t, installOpts).then(() => { res(); });
        });
      }))
      .then(() => {
        return this.ui.stopProgress();
      })
    });
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
