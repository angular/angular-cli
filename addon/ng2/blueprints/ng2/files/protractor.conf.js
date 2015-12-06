exports.config = {
  allScriptsTimeout: 11000,

  specs: [
    'e2e/**/*.e2e.js'
  ],

  capabilities: {
    'browserName': 'chrome'
  },

  directConnect: true,

  baseUrl: 'http://localhost:4200/',

  framework: 'jasmine',

  jasmineNodeOpts: {
    defaultTimeoutInterval: 30000
  },

  useAllAngular2AppRoots: true,

  beforeLaunch: function() {
    require('zone.js');
    require('reflect-metadata');
  }
};
