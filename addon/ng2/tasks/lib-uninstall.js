/* jshint node: true */
'use strict';

var Promise     = require('ember-cli/lib/ext/promise');
var Task        = require('ember-cli/lib/models/task');
var shellPromise = require ('../utilities/shell-promise');
var chalk       = require('chalk');
var path        = require('path');
var fs          = require('fs');
var _           = require('lodash');
var glob        = require('glob');
var appRoot     = path.resolve('./src');
var nodeModules = path.resolve('./node_modules');
var checkDirs   = ['components', 'providers', 'directives', 'pipes'];


function existsSync(path) {
  try {
    fs.accessSync(path);
    return true;
  }
  catch (e) {
    return false;
  }
}


module.exports = Task.extend({
  command: '',
  completionOKMessage: '',
  completionErrorMessage: 'Error uninstalling packages. Did you misspelt it?',

  run: function(options) {
    this.packages = options.packages || [];
    this.autoRemove = options.autoRemove || false;
    this.disableLogger();

    this.ui.startProgress(chalk.green('Uninstalling 3rd party package:',
      this.packages.join(', ')), chalk.green('.'));

    this.getPackagesDataBeforeRemoved(this.packages);

    this.npmOptions = ' --loglevel error --color always --optional --save-dev ' +
                      '--save-exact ' + !!options['save-exact'];

    var npmCommand = 'npm uninstall ' + this.packages.join(' ') + this.npmOptions;

    return shellPromise(npmCommand)
      .then(function(npmresp) {
        if (!npmresp.length) {
          this.completionErrorMessage = 'No packages uninstalled.';
          return this.announceErrorCompletion();
        }
        else {
          if (this.autoRemove) {
            this.removePackagesFromApp();
            return this.announceOKCompletion();
          }
          else {
            return this.uninstallProcedure()
            .then(function(resp) {
              return this.announceOKCompletion();
            }.bind(this));
          }
        }
      }.bind(this));
  },

  uninstallProcedure: function() {
    this.ui.writeLine(chalk.yellow('Uninstalled package:', this.packages.join(',')));

    return this.ui.prompt({
      type: 'input',
      name: 'remove',
      message: 'Do you want to automatically remove package from you app?',
      default: function() { return 'Y'; },
      validate: function(value) {
        return /[YN]/i.test(value) ? true : 'Enter Y(es) or N(o)';
      }
    })
    .then(function(confirm) {
      if (confirm.remove.toLowerCase().substring(0, 1) === 'y') {
        this.removePackagesFromApp();
      }

      return Promise.resolve();
    }.bind(this));
  },

  parseFile: function (packageName) {
    var packagePath = path.resolve(process.cwd(), 'node_modules', packageName, packageName + '.ts');

    if (!existsSync(packagePath)) {
      return false;
    }

    var contents = fs.readFileSync(packagePath, 'utf8');
    var data = {};

    data.Directive = [];
    data.Pipe = [];
    data.Provider = [];
    data.styleUrl = [];

    var contentsArr = contents.split('\n');
    contentsArr.forEach(function(line, index) {
      if (/directives:/.test(line)) {
        data.Directive = this.parseData(line);
      }
      else if (/pipes:/.test(line)) {
        data.Pipe = this.parseData(line);
      }
      else if (/providers:/.test(line)) {
        data.Provider = this.parseData(line);
      }
      else if (/styles:/.test(line)) {
        //data.styles = this.parseData(line);
      }
      else if (/styleUrls:/.test(line)) {
        data.styleUrl = this.parseData(line);
      }
    }.bind(this));

    return data;
  },

  parseData: function (string) {
    var match = string.match(/\[(.*?)\]/)[0].replace(/\[/, '').replace(/\]/, '').replace(' ', '');
    return match.split(',');
  },

  removePackagesFromApp: function() {
    this.removedPackagesData.forEach(function(packageData) {
      var files = glob.sync(process.cwd() +  '/src/**/*.ts');
      var contents;
      var allComponents = [].concat(packageData.Directive)
                            .concat(packageData.Provider)
                            .concat(packageData.Pipe)
                            .concat(packageData.styleUrl)
                            .reverse();
      var packageRegex = new RegExp(packageData.pkg_name);
      var compRegex = new RegExp('(' + allComponents.join('|') + ')', 'g');
      var matches;
      var helperRegex;

      files.forEach(function(file, findex) {
        var contents = fs.readFileSync(file, 'utf8').split('\n');

        contents.forEach(function(line, index) {
          if (/import/.test(line) && /;/.test(line) && packageRegex.test(line)) {
            contents.splice(index, 1);
          }

          if (compRegex.test(line)) {
            matches = line.match(compRegex);
            matches.forEach(function(match) {
              helperRegex = new RegExp(match + '\,?');
              contents[index] = contents[index].replace(helperRegex, '');
            });
          }
        });

        contents = this.cleanAfterRemoval(contents);

        fs.writeFileSync(file, contents.join('\n'), 'utf8');
      }.bind(this));

      this.ui.writeLine(chalk.yellow(packageData.pkg_name) + ' ' + chalk.green('successfully removed from app.'));

    }.bind(this));
  },

  cleanAfterRemoval: function(contents) {
    var bootstrap = false;

    contents = contents.filter(function(line) {
      if (/bootstrap\(/.test(line)) {
        bootstrap = true;
      }
      return (bootstrap) ? line.trim().length > 0 : true;
    });

    if (bootstrap) {
      contents.forEach(function(line, index) {
        if (/bootstrap\(/.test(line) && /\]\)\;/.test(contents[index + 1])) {
          contents[index] = line.match(/bootstrap\((.*?)\,/)[0].replace(',', '') + ');';
          contents[index + 1] = '';
        }
      });
    }

    return contents;
  },

  getPackagesDataBeforeRemoved: function(packages) {
    var data;
    this.removedPackagesData = [];

    packages.forEach(function(pkg) {
      data = this.parseFile(pkg);
      if (data) {
        data.pkg_name = pkg;
        this.removedPackagesData.push(data);
      }
    }.bind(this));
  },

  announceOKCompletion: function() {
    this.completionOKMessage = 'Done.';
    this.ui.writeLine(chalk.green(this.completionOKMessage));
    this.done();
  },

  announceErrorCompletion: function() {
    this.ui.writeLine(chalk.red(this.completionErrorMessage));
    this.done();
  },

  done: function() {
    this.ui.stopProgress();
    this.restoreLogger();
  },

  disableLogger: function() {
    this.oldLog = console.log;
    console.log = function() {};
  },

  restoreLogger: function() {
    console.log = this.oldLog; // Hack, see above
  }

});
