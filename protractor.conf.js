
exports.config = {
  baseUrl: 'http://localhost:3000/examples/todo',

  specs: [
    'test/*.e2e.js'
  ],

  allScriptsTimeout: 11000,

  framework: 'jasmine',

  jasmineNodeOpts: {
    defaultTimeoutInterval: 60000,
    showTiming: true
  },

  capabilities: {
    'browserName': 'chrome'
  },

  seleniumAddress: 'http://localhost:4444/wd/hub',

  onPrepare: function() {
    browser.ignoreSynchronization = true;
  }

};
