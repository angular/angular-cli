// @ts-check
// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts
// https://saucelabs.com/platform/platform-configurator

const { SpecReporter, StacktraceOption } = require('jasmine-spec-reporter');

const tunnelIdentifier = process.env['SAUCE_TUNNEL_IDENTIFIER'];

/**
 * @type { import("protractor").Config }
 */
exports.config = {
  sauceUser: process.env['SAUCE_USERNAME'],
  sauceKey: process.env['SAUCE_ACCESS_KEY'],

  allScriptsTimeout: 11000,
  specs: ['./src/**/*.e2e-spec.ts'],

  // NOTE: https://saucelabs.com/products/platform-configurator can be used to determine configuration values
  multiCapabilities: [
    {
      browserName: 'chrome',
      version: '132',
      platform: 'Windows 11',
      tunnelIdentifier,
    },
    {
      browserName: 'chrome',
      version: '131',
      platform: 'Windows 11',
      tunnelIdentifier,
    },
    {
      browserName: 'firefox',
      version: '134',
      platform: 'Windows 11',
      tunnelIdentifier,
    },
    {
      browserName: 'firefox',
      version: '128', // Latest Firefox ESR version as of Jan 2025
      platform: 'Windows 11',
      tunnelIdentifier,
    },
    {
      browserName: 'safari',
      platform: 'macOS 13',
      version: '17',
      tunnelIdentifier,
    },
    {
      browserName: 'safari',
      platform: 'macOS 12',
      version: '16',
      tunnelIdentifier,
    },
    {
      browserName: 'MicrosoftEdge',
      platform: 'Windows 11',
      version: '132',
      tunnelIdentifier,
    },
    {
      browserName: 'MicrosoftEdge',
      platform: 'Windows 11',
      version: '131',
      tunnelIdentifier,
    },
  ],

  // Only allow one session at a time to prevent over saturation of Saucelabs sessions.
  maxSessions: 1,

  SELENIUM_PROMISE_MANAGER: false,
  baseUrl: 'http://localhost:2000/',
  framework: 'jasmine',
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000,
    print: function () {},
  },

  onPrepare() {
    require('ts-node').register({
      project: require('path').join(__dirname, './tsconfig.json'),
    });
    jasmine.getEnv().addReporter(
      new SpecReporter({
        spec: {
          displayStacktrace: StacktraceOption.PRETTY,
        },
      }),
    );
  },
};
