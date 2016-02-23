var cli  = require('ember-cli/lib/cli');
var path = require('path');
var fs   = require('fs');

module.exports = function (options) {
  process.stdout.write = (function(write) {
    return function(string, encoding, fd) {
      if (/version:/.test(string) || /warning:/.test(string)) {
        return;
      }
      string = string.replace(/ember-cli(?!.com)/g, 'angular-cli');
      string = string.replace(/ember(?!-cli.com)/g, 'ng');
      write.apply(process.stdout, arguments)
    }
  })(process.stdout.write);

  process.stderr.write = (function(write) {
    return function(string, encoding, fd) {
      string = string.replace(/ember-cli(?!.com)/g, 'angular-cli');
      string = string.replace(/ember(?!-cli.com)/g, 'ng');
      write.apply(process.stdout, arguments)
    }
  })(process.stderr.write);
    
  options.cli = {
    name: 'ng',
    root: path.join(__dirname, '..', '..'),
    npmPackage: 'angular-cli'
  };
    
  return cli(options);
};