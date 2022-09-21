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

  multiCapabilities: [
    {
      browserName: 'chrome',
      platform: 'Windows 11',
      version: '105',
      tunnelIdentifier,
    },
    {
      browserName: 'firefox',
      version: '104',
      platform: 'Windows 11',
      tunnelIdentifier,
    },
    {
      browserName: 'firefox',
      version: '91', // Latest Firefox ESR version
      platform: 'Windows 11',
      tunnelIdentifier,
    },
    {
      browserName: 'safari',
      platform: 'macOS 12',
      version: '15',
      tunnelIdentifier,
    },
    {
      browserName: 'safari',
      platform: 'macOS 11.00',
      version: '14',
      tunnelIdentifier,
    },
    {
      browserName: 'MicrosoftEdge',
      platform: 'Windows 11',
      version: '103',
      tunnelIdentifier,
    },
    {
      browserName: 'MicrosoftEdge',
      platform: 'Windows 11',
      version: '104',
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
