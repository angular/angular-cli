'use strict';

const MockUI = require('./mock-ui');
const cli = require('@angular/cli/lib/cli');

module.exports = function ng(args) {
  process.env.PWD = process.cwd();

  return cli({
    inputStream: [],
    outputStream: [],
    cliArgs: args,
    UI: MockUI,
    testing: true
  });
};
