/* global require, module */

var Angular2App = require('angular-cli/lib/broccoli/angular2-app');

module.exports = function(defaults) {
  return new Angular2App(defaults, {
    vendorNpmFiles: [
      'systemjs/dist/system-polyfills*.+(js|js.map)',
      'systemjs/dist/system*.+(js|js.map)',
      'zone.js/dist/**/*.+(js|js.map)',
      'es6-shim/es6-shim*.+(js|js.map)',
      'reflect-metadata/**/*.+(ts|js|js.map)',
      'rxjs/**/*.+(js|js.map)',
      '@angular/**/*.+(js|js.map)'
    ]
  });
};
