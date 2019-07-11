// @ts-check
// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

const { SpecReporter } = require('jasmine-spec-reporter');

const tunnelIdentifier = process.env['SAUCE_TUNNEL_IDENTIFIER'];

/**
 * @type { import("protractor").Config }
 */
exports.config = {
  sauceUser: process.env['SAUCE_USERNAME'],
  sauceKey: process.env['SAUCE_ACCESS_KEY'],

  allScriptsTimeout: 11000,
  specs: ['./src/**/*.e2e-spec.ts'],

  multiCapabilities: [
    {
      browserName: 'chrome',
      version: '41',
      'tunnel-identifier': tunnelIdentifier,
    },
    {
      browserName: 'chrome',
      version: '74',
      'tunnel-identifier': tunnelIdentifier,
    },
    {
      browserName: 'safari',
      platform: 'OS X 10.11',
      version: '9.0',
      'tunnel-identifier': tunnelIdentifier,
    },
    {
      browserName: 'safari',
      platform: 'OS X 10.12',
      version: '10.1',
      'tunnel-identifier': tunnelIdentifier,
    },
    {
      browserName: 'safari',
      platform: 'macOS 10.14',
      version: '12.0',
      'tunnel-identifier': tunnelIdentifier,
    },
    {
      browserName: 'firefox',
      version: '48.0',
      'tunnel-identifier': tunnelIdentifier,
    },
    {
      browserName: 'firefox',
      version: '60.0',
      'tunnel-identifier': tunnelIdentifier,
    },
    {
      browserName: 'firefox',
      version: '67.0',
      'tunnel-identifier': tunnelIdentifier,
    },
    {
      browserName: 'internet explorer',
      platform: 'Windows 2012',
      version: '10',
      'tunnel-identifier': tunnelIdentifier,
    },
    {
      browserName: 'internet explorer',
      platform: 'Windows 8.1',
      version: '11',
      'tunnel-identifier': tunnelIdentifier,
    },
    // TODO: Fails due to whitespace issue:
    // Expected 'Welcome to test-project! ' to equal 'Welcome to test-project!'.
    // {
    //   browserName: "MicrosoftEdge",
    //   platform: 'Windows 10',
    //   version: "14.14393",
    //   'tunnel-identifier': tunnelIdentifier,
    // },
    {
      browserName: "MicrosoftEdge",
      platform: 'Windows 10',
      version: "16.16299",
      'tunnel-identifier': tunnelIdentifier,
    },
  ],

  baseUrl: 'http://localhost:8080/',
  framework: 'jasmine',
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000,
    print: function() {},
  },

  onPrepare() {
    require('ts-node').register({
      project: require('path').join(__dirname, './tsconfig.json'),
    });
    jasmine.getEnv().addReporter(new SpecReporter({ spec: { displayStacktrace: true } }));
  },
};
