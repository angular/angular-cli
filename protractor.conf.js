
exports.config = {
  baseUrl: 'http://localhost:3000/examples',

  specs: [
    'test/*.e2e.js'
  ],

  allScriptsTimeout: 11000,

  framework: 'jasmine2',

  jasmineNodeOpts: {
    defaultTimeoutInterval: 60000,
    showTiming: true
  },

  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      //Important for benchpress to get timeline data from the browser
      'args': ['--js-flags=--expose-gc'],
      'perfLoggingPrefs': {
        'traceCategories': 'blink.console,disabled-by-default-devtools.timeline'
      }
    },
    loggingPrefs: {
      performance: 'ALL'
    }
  },

  // https://github.com/mllrsohn/gulp-protractor#protractor-webdriver
  seleniumServerJar: './node_modules/protractor/selenium/selenium-server-standalone-2.45.0.jar',
  //seleniumAddress: 'http://localhost:4444/wd/hub',

  onPrepare: function() {
    browser.manage().deleteAllCookies();
    browser.ignoreSynchronization = true;
    /*
    // open a new browser for every benchmark
    var originalBrowser = browser;
    var _tmpBrowser;
    beforeEach(function() {
      global.browser = originalBrowser.forkNewDriverInstance();
      global.element = global.browser.element;
      global.$ = global.browser.$;
      global.$$ = global.browser.$$;
      global.browser.ignoreSynchronization = true;
    });
    afterEach(function() {
      global.browser.quit();
      global.browser = originalBrowser;
    });
    */
  }

};