/*global jasmine, __karma__, window*/
Error.stackTraceLimit = Infinity;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;

__karma__.loaded = function () {
};

System.config({
  packages: {
    'base/dist/app': {
      defaultExtension: false,
      format: 'register',
      map: Object.keys(window.__karma__.files)
        .filter(onlyAppFiles)
        .reduce(function (pathsMapping, appPath) {
          var moduleName = appPath.replace(/^\/base\/dist\/app\//, './').replace(/\.js$/, '');
          pathsMapping[moduleName] = appPath + '?' + window.__karma__.files[appPath];
          return pathsMapping;
        }, {})
    }
  }
});

System.import('angular2/testing').then(function (testing) {
  return System.import('angular2/platform/testing/browser').then(function (providers) {
    testing.setBaseTestProviders(providers.TEST_BROWSER_PLATFORM_PROVIDERS,
      providers.TEST_BROWSER_APPLICATION_PROVIDERS);
  });
}).then(function () {
  return Promise.all(
    Object.keys(window.__karma__.files)
      .filter(onlySpecFiles)
      .map(function (moduleName) {
        return System.import(moduleName);
      }));
}).then(function () {
  __karma__.start();
}, function (error) {
  __karma__.error(error.stack || error);
});

function onlyAppFiles(filePath) {
  return /^\/base\/dist\/app\/(?!.*\.spec\.js$)([a-z0-9-_\.\/]+)\.js$/.test(filePath);
}

function onlySpecFiles(path) {
  return /\.spec\.js$/.test(path);
}
