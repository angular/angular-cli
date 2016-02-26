Error.stackTraceLimit = Infinity;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;

__karma__.loaded = function() {};

System.config({
  transpiler: 'typescript',
  typescriptOptions: {
    emitDecoratorMetadata: true
  },
  packages: {
    'app/': {
      defaultExtension: 'ts'
    }
  }
});

System.import('angular2/testing')
  .then(function(testing) {
    return System.import('angular2/platform/testing/browser')
      .then(function(providers) {
        testing.setBaseTestProviders(providers.TEST_BROWSER_PLATFORM_PROVIDERS,
          providers.TEST_BROWSER_APPLICATION_PROVIDERS);
      });
  })
  .then(function() {
    return Promise.all(
      Object.keys(window.__karma__.files)
      .filter(onlySpecFiles)
      .map(removePathPrefix)
      .map(function(moduleName) {
        return System.import(moduleName)
          .catch(console.error.bind(console));
      }));
  })
  .then(function() {
    __karma__.start();
  })
  .catch(function() {
    __karma__.error(error.stack || error);
  });

function onlySpecFiles(path) {
  return /\.spec\.ts$/.test(path);
}

function removePathPrefix(path) {
  return path.replace(/\/base\/src\/app/, '/app');
}
