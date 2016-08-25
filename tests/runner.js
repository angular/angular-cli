/* eslint-disable no-console */
'use strict';

require('../lib/bootstrap-local');

var Mocha = require('mocha');
var glob = require('glob');
var path = require('path');

var root = 'tests/{acceptance,models,e2e}';
var specFiles = glob.sync(root + '/**/*.spec.*');
var mocha = new Mocha({ timeout: 5000, reporter: 'spec' });

process.env.CLI_ROOT = process.env.CLI_ROOT || path.resolve(__dirname, '..');

specFiles.forEach(mocha.addFile.bind(mocha));

mocha.run(function (failures) {
  process.on('exit', function () {
    process.exit(failures);
  });
});
