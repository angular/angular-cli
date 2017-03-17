'use strict';

var MockUI = require('./mock-ui');
var Cli = require('@angular/cli/lib/cli');

module.exports = function ng(args) {
  var cli;

  process.env.PWD = process.cwd();

  cli = new Cli({
    inputStream: [],
    outputStream: [],
    cliArgs: args,
    UI: MockUI,
    testing: true
  });

  return cli;
};
