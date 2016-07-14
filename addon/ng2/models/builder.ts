const fs          = require('fs-extra');
const existsSync  = require('exists-sync');
const path        = require('path');
const Promise     = require('ember-cli/lib/ext/promise');
const Task        = require('ember-cli/lib/models/task');
const SilentError = require('silent-error');
const chalk       = require('chalk');
const attemptNeverIndex = require('ember-cli/lib/utilities/attempt-never-index');
const findBuildFile = require('ember-cli/lib/utilities/find-build-file');
const viz = require('broccoli-viz');
const FSMonitor = require('fs-monitor-stack');
const Sync = require('tree-sync');
const mkdirp = require('mkdirp');

let resolve = null;
let promise = new Promise((r) => resolve = r);




var signalsTrapped = false;
var buildCount = 0;

function outputViz(count, result, monitor) {
  var processed = viz.process(result.graph);

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

module.exports = Task.extend({
  setupBuilder: function() {
    this.environment = this.environment || 'development';
    process.env.ANGULAR_ENV = process.env.ANGULAR_ENV || process.env.EMBER_CLI || this.environment;
    process.env.EMBER_ENV = process.env.ANGULAR_ENV;

    var buildFile = findBuildFile('angular-cli-build.js');
    this.tree = buildFile({ project: this.project });

    if (webpack) {
      console.log('webpack');
    } else {
      var broccoli = require('ember-cli-broccoli');
      this.builder = new broccoli.Builder(this.tree);
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
    this.setupBuilder();
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

  build: function(...args: any[]) {
    attemptNeverIndex('tmp');
    return promise;
    // return Promise.resolve();
    // if (this.webpack) {
    //   console.log(1, process.cwd());
    //   return new Promise((resolve, reject) => {
    //     this.webpack.run((err, stats) => {
    //       console.log(!!err, stats);
    //       if (err) {
    //         reject(err);
    //       }
    //       resolve();
    //     });
    //   });
    // }
    // return this.builder.build(...args);
  },

  cleanup: function() {
    var ui = this.ui;

    // if (this.webpack) {
      // this.webpack.cleanupAndExit();
      return Promise.resolve();
    // } else {
    //   return this.builder.cleanup().catch(function (err) {
    //     ui.writeLine(chalk.red('Cleanup error.'));
    //     ui.writeError(err);
    //   });
    // }
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
