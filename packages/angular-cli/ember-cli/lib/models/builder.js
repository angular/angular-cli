'use strict';

var fs          = require('fs-extra');
var existsSync  = require('exists-sync');
var path        = require('path');
var Promise     = require('../ext/promise');
var Task        = require('./task');
var SilentError = require('silent-error');
var chalk       = require('chalk');
var attemptNeverIndex = require('../utilities/attempt-never-index');
var findBuildFile = require('../utilities/find-build-file');
// var viz = require('broccoli-viz');
var FSMonitor = require('fs-monitor-stack');
var Sync = require('tree-sync');
var mkdirp = require('mkdirp');

var signalsTrapped = false;
var buildCount = 0;


module.exports = Task.extend({
  setupBroccoliBuilder: function() {
    this.environment = this.environment || 'development';
    process.env.EMBER_ENV = process.env.EMBER_ENV || this.environment;

    var broccoli = require('ember-cli-broccoli');
    var hasBrocfile = existsSync(path.join('.', 'Brocfile.js'));
    var buildFile = findBuildFile('ember-cli-build.js');

    if (hasBrocfile) {
      this.ui.writeDeprecateLine('Brocfile.js has been deprecated in favor of ember-cli-build.js. Please see the transition guide: https://github.com/ember-cli/ember-cli/blob/master/TRANSITION.md#user-content-brocfile-transition.');
      this.tree = broccoli.loadBrocfile();
    } else if (buildFile) {
      this.tree = buildFile({ project: this.project });
    } else {
      throw new Error('No ember-cli-build.js found. Please see the transition guide: https://github.com/ember-cli/ember-cli/blob/master/TRANSITION.md#user-content-brocfile-transition.');
    }

    this.builder = new broccoli.Builder(this.tree);

    var builder = this;

    if (process.env.BROCCOLI_VIZ) {
      this.builder.on('start', function() {
        builder.monitor = new FSMonitor();
      });

      this.builder.on('nodeStart', function(node) {
        builder.monitor.push(node);
      });

      this.builder.on('nodeEnd', function() {
        builder.monitor.pop();
      });
    }
  },

  trapSignals: function() {
    if (!signalsTrapped) {
      process.on('SIGINT',  this.onSIGINT.bind(this));
      process.on('SIGTERM', this.onSIGTERM.bind(this));
      process.on('message', this.onMessage.bind(this));
      signalsTrapped = true;
    }
  },

  init: function() {
    this.setupBroccoliBuilder();
    this.trapSignals();
  },

  /**
    Determine whether the output path is safe to delete. If the outputPath
    appears anywhere in the parents of the project root, the build would
    delete the project directory. In this case return `false`, otherwise
    return `true`.
  */
  canDeleteOutputPath: function(outputPath) {
    var rootPathParents = [this.project.root];
    var dir = path.dirname(this.project.root);
    rootPathParents.push(dir);
    while (dir !== path.dirname(dir)) {
      dir = path.dirname(dir);
      rootPathParents.push(dir);
    }
    return rootPathParents.indexOf(outputPath) === -1;
  },

  copyToOutputPath: function(inputPath) {
    var outputPath = this.outputPath;

    mkdirp.sync(outputPath);

    if (!this.canDeleteOutputPath(outputPath)) {
      throw new SilentError('Using a build destination path of `' + outputPath + '` is not supported.');
    }

    var sync = this._sync;
    if (sync === undefined) {
      this._sync = sync = new Sync(inputPath, path.resolve(this.outputPath));
    }

    sync.sync();
  },

  processBuildResult: function(results) {
    var self = this;

    return Promise.resolve()
      .then(function() {
        return self.copyToOutputPath(results.directory);
      })
      .then(function() {
        return results;
      });
  },

  processAddonBuildSteps: function(buildStep, results) {
    var addonPromises = [];
    if (this.project && this.project.addons.length) {
      addonPromises = this.project.addons.map(function(addon) {
        if (addon[buildStep]) {
          return addon[buildStep](results);
        }
      }).filter(Boolean);
    }

    return Promise.all(addonPromises).then(function() {
      return results;
    });
  },

  build: function() {
    var self = this;
    var args = [];
    for (var i = 0, l = arguments.length; i < l; i++) {
      args.push(arguments[i]);
    }

    attemptNeverIndex('tmp');

    return this.processAddonBuildSteps('preBuild')
       .then(function() {
         return self.builder.build.apply(self.builder, args);
       })
      .then(function(result) {
        // if (process.env.BROCCOLI_VIZ) {
        //   outputViz(buildCount++, result, self.monitor);
        // }
        return result;
      })
      .then(this.processAddonBuildSteps.bind(this, 'postBuild'))
      .then(this.processBuildResult.bind(this))
      .then(this.processAddonBuildSteps.bind(this, 'outputReady'))
      .catch(function(error) {
        this.processAddonBuildSteps('buildError', error);
        throw error;
      }.bind(this));
  },

  cleanup: function() {
    var ui = this.ui;

    return this.builder.cleanup().catch(function(err) {
      ui.writeLine(chalk.red('Cleanup error.'));
      ui.writeError(err);
    });
  },

  cleanupAndExit: function() {
    this.cleanup().finally(function() {
      process.exit(1);
    });
  },

  onSIGINT: function() {
    this.cleanupAndExit();
  },
  onSIGTERM: function() {
    this.cleanupAndExit();
  },
  onMessage: function(message) {
    if (message.kill) {
      this.cleanupAndExit();
    }
  }
});
