/* global require, module */

var Angular2App = require('angular-cli/lib/broccoli/angular2-app');

module.exports = function(defaults) {
  return new Angular2App(defaults, {
    vendorNpmFiles: [
      'reflect-metadata/**/*.js',
      'zone.js/**/*.js',
      'systemjs/**/*.js',
      'es6-shim/**/*.js',
      'angular2/**/*.js',
      'rxjs/**/*.js'
    ]
  });
};
