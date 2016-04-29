/* jshint node: true */
'use strict';

var Command = require('ember-cli/lib/models/command');
const config = require('../models/config');
var E2ETask = require('../tasks/e2e');

module.exports = Command.extend({
  name: 'e2e',
  description: 'Run e2e tests in existing project',
  works: 'insideProject',
  run: function () {
    this.project.ngConfig = this.project.ngConfig || config.CliConfig.fromProject();

    var e2eTask = new E2ETask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    return e2eTask.run();
  }
});
