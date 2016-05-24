/* global require, module */

var Angular2SharePointApp = require('angular-cli/lib/broccoli/angular2-sharepoint-app');

module.exports = function(defaults) {
  return new Angular2SharePointApp(defaults, {
    vendorNpmFiles: [
      'systemjs/dist/system-polyfills.js',
      'systemjs/dist/system.src.js',
      'zone.js/dist/**/*.+(js|js.map)',
      'es6-shim/es6-shim.js',
      'reflect-metadata/**/*.+(js|js.map)',
      'rxjs/**/*.+(js|js.map)',
      '@angular/**/*.+(js|js.map)'
    ]
  });
};
