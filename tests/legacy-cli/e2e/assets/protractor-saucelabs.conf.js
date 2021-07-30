// @ts-check
// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

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

  multiCapabilities: [
    {
      browserName: 'chrome',
      platform: 'Windows 10',
      version: '89.0',
      tunnelIdentifier,
    },
    {
      browserName: 'firefox',
      version: '86.0',
      platform: 'Windows 10',
      tunnelIdentifier,
    },
    {
      browserName: 'firefox',
      version: '78.0', // Latest Firefox ESR version
      platform: 'Windows 10',
      tunnelIdentifier,
    },
    {
      browserName: 'safari',
      platform: 'macOS 11.00',
      version: '14',
      tunnelIdentifier,
    },
    {
      browserName: 'safari',
      platform: 'macOS 10.15',
      version: '13.1',
      tunnelIdentifier,
    },
    {
      browserName: 'MicrosoftEdge',
      platform: 'Windows 10',
      version: '88.0',
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
    // Fix for Safari 12 -- https://github.com/angular/protractor/issues/4964
    browser.resetUrl = 'about:blank';

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
