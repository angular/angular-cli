import * as EmberBuilderModel from 'ember-cli/lib/models/builder';
import * as Task from 'ember-cli/lib/models/task';
import * as findBuildFile from  'ember-cli/lib/utilities/find-build-file';
import * as broccoli from 'ember-cli-broccoli';
import * as FSMonitor from 'fs-monitor-stack';
import * as fs from 'fs-extra';
import * as existsSync from '../utilities/exists-sync';
import * as path from 'path';
import * as Promise from 'ember-cli/lib/ext/promise';
import * as SilentError from 'silent-error';
import * as chalk from 'chalk';
import * as attemptNeverIndex from 'ember-cli/lib/utilities/attempt-never-index';
import * as viz from 'broccoli-viz';
import * as Sync from 'tree-sync';
import * as mkdirp from 'mkdirp';

let signalsTrapped = false;
let buildCount = 0;

function outputViz(count, result, monitor) {
  let processed = viz.process(result.graph);

  processed.forEach(function(node) {
    node.stats.fs = monitor.statsFor(node);
  });

  fs.writeFileSync('graph.' + count + '.dot', viz.dot(processed));
  fs.writeFileSync('graph.' + count + '.json', JSON.stringify({
    summary: {
      buildCount: count,
      output: result.directory,
      totalTime: result.totalTime,
      totalNodes: processed.length,
      stats: {
        fs: monitor.totalStats()
      }
    },
    nodes: processed
  }));
}

const BuilderModel = Task.extend({
  setupBroccoliBuilder: function() {
    this.environment = this.environment || 'development';
    process.env.EMBER_ENV = process.env.EMBER_ENV || this.environment;

    let buildFile = findBuildFile('angular-cli-build.js');

    if (buildFile) {
      this.tree = buildFile({ project: this.project });
    } else {
      throw new Error(`No angular-cli-build.js found.`);
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
        if (process.env.BROCCOLI_VIZ) {
          outputViz(buildCount++, result, self.monitor);
        }
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

module.exports = BuilderModel;
