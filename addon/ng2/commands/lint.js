/* jshint node: true */
'use strict';

var Command = require('ember-cli/lib/models/command');
var LintTask = require('../tasks/lint');

module.exports = Command.extend({
  name: 'lint',
  description: 'Lints code in existing project',
  works: 'insideProject',
  run: function() {
    var lintTask = new LintTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    return lintTask.run();
  }
});
