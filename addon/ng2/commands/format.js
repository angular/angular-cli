/* jshint node: true */
'use strict';

var Command = require('ember-cli/lib/models/command');
var FormatTask = require('../tasks/format');

module.exports = Command.extend({
  name: 'format',
  description: 'Formats code in existing project',
  works: 'insideProject',
  run: function () {
    var formatTask =
      new FormatTask({
        ui: this.ui,
        analytics: this.analytics,
        project: this.project
      });

    return formatTask.run();
  }
});
