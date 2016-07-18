/*eslint-disable no-console */
'use strict';

var Command = require('ember-cli/lib/models/command');
var path = require('path');
var fs = require('fs');

module.exports = Command.extend({
  name: 'completion',
  description: 'Adds autocomplete functionality to `ng` commands and subcommands',
  works: 'everywhere',
  run: function() {
    var scriptPath = path.resolve(__dirname, '..', 'utilities', 'completion.sh');
    var scriptOutput = fs.readFileSync(scriptPath, 'utf8');

    console.log(scriptOutput);
  }
});
