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
      tunnelIdentifier,
    },
    {
      browserName: 'chrome',
      version: '75',
      tunnelIdentifier,
    },
    {
      browserName: 'safari',
      platform: 'OS X 10.11',
      version: '9.0',
      tunnelIdentifier,
    },
    // TODO: Investigate. Failure:
    // Failed: Error while running testForAngular: undefined is not an object (evaluating 'd.prototype[b].apply')
    // {
    //   browserName: 'safari',
    //   platform: 'OS X 10.12',
    //   version: '10.1',
    //   tunnelIdentifier,
    // },
    {
      browserName: 'safari',
      platform: 'macOS 10.13',
      version: '11.1',
      tunnelIdentifier,
    },
    {
      browserName: 'safari',
      platform: 'macOS 10.13',
      version: '12.1',
      tunnelIdentifier,
    },
    {
      browserName: 'firefox',
      version: '48',
      tunnelIdentifier,
    },
    {
      browserName: 'firefox',
      version: '60',
      tunnelIdentifier,
    },
    {
      browserName: 'firefox',
      version: '68',
      tunnelIdentifier,
    },
    {
      browserName: 'internet explorer',
      platform: 'Windows 8',
      version: '10',
      tunnelIdentifier,
    },
    {
      browserName: 'internet explorer',
      platform: 'Windows 8.1',
      version: '11',
      tunnelIdentifier,
    },
    {
      browserName: "MicrosoftEdge",
      platform: 'Windows 10',
      version: "14.14393",
      tunnelIdentifier,
    },
    {
      browserName: "MicrosoftEdge",
      platform: 'Windows 10',
      version: "17.17134",
      tunnelIdentifier,
    },
    {
      browserName: "MicrosoftEdge",
      platform: 'Windows 10',
      version: "18.17763",
      tunnelIdentifier,
    },
  ],

  baseUrl: 'http://localhost:2000/',
  framework: 'jasmine',
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000,
    print: function() {},
  },

  onPrepare() {
    // Fix for Safari 12 -- https://github.com/angular/protractor/issues/4964
    browser.resetUrl = 'about:blank';

    require('ts-node').register({
      project: require('path').join(__dirname, './tsconfig.json'),
    });
    jasmine.getEnv().addReporter(new SpecReporter({ spec: { displayStacktrace: true } }));
  },
};
