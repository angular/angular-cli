/*global jasmine, __karma__, window*/
Error.stackTraceLimit = Infinity;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;

__karma__.loaded = function () {
};

var distPath = '/base/dist/';
var appPath = distPath + 'app/';

function isJsFile(path) {
  return path.slice(-3) == '.js';
}

function isSpecFile(path) {
  return path.slice(-8) == '.spec.js';
}

function isAppFile(path) {
  return isJsFile(path) && (path.substr(0, appPath.length) == appPath);
}

var allSpecFiles = Object.keys(window.__karma__.files)
  .filter(isSpecFile)
  .filter(isAppFile);

// Load our SystemJS configuration.
System.import('base/dist/system-config.js').then(function(systemJsConfig) {
  // We need to add the distPrefix to our system config packages.
  var config = systemJsConfig.config;
  Object.keys(config.packages).forEach(function(pkgName) {
    if (pkgName[0] != '/' && pkgName[0] != '.') {
      var pkg = config.packages[pkgName];
      delete config.packages[pkgName];
      config.packages[distPath + pkgName] = pkg;
    }
  });

  System.config(config);
}).then(function() {
  // Load and configure the TestComponentBuilder.
  return Promise.all([
    System.import('angular2/testing'),
    System.import('angular2/platform/testing/browser')
  ]).then(function (providers) {
    var testing = providers[0];
    var testingBrowser = providers[1];

    testing.setBaseTestProviders(testingBrowser.TEST_BROWSER_PLATFORM_PROVIDERS,
      testingBrowser.TEST_BROWSER_APPLICATION_PROVIDERS);
  });
}).then(function() {
  // Finally, load all spec files.
  // This will run the tests directly.
  return Promise.all(
    allSpecFiles.map(function (moduleName) {
      return System.import(moduleName);
    }));
}).then(__karma__.start, __karma__.error);