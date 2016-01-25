'use strict';

var Mocha = require('mocha');
var glob = require('glob');

var root = 'tests/{unit,acceptance,e2e}';
var specFiles = glob.sync(root + '/**/*.spec.js');
var mocha = new Mocha({
  timeout: 5000,
  reporter: 'spec'
});

specFiles.forEach(mocha.addFile.bind(mocha));

mocha.run(function(failures){
  process.on('exit', function () {
    process.exit(failures);
  });
});
