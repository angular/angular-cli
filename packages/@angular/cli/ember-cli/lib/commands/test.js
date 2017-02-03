'use strict';

var Command     = require('../models/command');
var SilentError = require('silent-error');
var path        = require('path');
var existsSync  = require('exists-sync');

var defaultPort = 7357;

module.exports = Command.extend({
  name: 'test',
  description: 'Runs your app\'s test suite.',
  aliases: ['t'],

  availableOptions: [
    { name: 'environment', type: String,  default: 'test',          aliases: ['e'] },
    { name: 'config-file', type: String,                            aliases: ['c', 'cf']},
    { name: 'server',      type: Boolean, default: false,           aliases: ['s'] },
    { name: 'host',        type: String,                            aliases: ['H'] },
    { name: 'test-port',   type: Number,  default: defaultPort,     aliases: ['tp'], description: 'The test port to use when running with --server.' },
    { name: 'filter',      type: String,                            aliases: ['f'],  description: 'A string to filter tests to run' },
    { name: 'module',      type: String,                            aliases: ['m'],  description: 'The name of a test module to run' },
    // { name: 'watcher',     type: String,  default: 'events',        aliases: ['w'] },
    { name: 'launch',      type: String,  default: false,                            description: 'A comma separated list of browsers to launch for tests.' },
    { name: 'reporter',    type: String,                            aliases: ['r'],  description: 'Test reporter to use [tap|dot|xunit] (default: tap)' },
    { name: 'silent',      type: Boolean, default: false,                            description: 'Suppress any output except for the test report' },
    { name: 'test-page',   type: String,                                             description: 'Test page to invoke' },
    { name: 'path',        type: 'Path',                                             description: 'Reuse an existing build at given path.' },
    { name: 'query',       type: String,                                             description: 'A query string to append to the test page URL.' }
  ],

  init: function() {
    this.assign    = require('lodash/assign');

    if (!this.testing) {
      process.env.EMBER_CLI_TEST_COMMAND = true;
    }
  },

  _generateCustomConfigs: function(options) {
    var config = {};
    if (!options.filter && !options.module && !options.launch && !options.query && !options['test-page']) { return config; }

    var testPage = options['test-page'];
    var queryString = this.buildTestPageQueryString(options);
    if (testPage) {
      var containsQueryString = testPage.indexOf('?') > -1;
      var testPageJoinChar    = containsQueryString ? '&' : '?';
      config.testPage = testPage + testPageJoinChar + queryString;
    }
    if (queryString) {
      config.queryString = queryString;
    }

    if (options.launch) {
      config.launch = options.launch;
    }

    return config;
  },

  _generateTestPortNumber: function(options) {
    if (options.port && options.testPort !== defaultPort || !isNaN(parseInt(options.testPort)) && !options.port) { return options.testPort; }
    if (options.port) { return parseInt(options.port, 10) + 1; }
  },

  buildTestPageQueryString: function(options) {
    var params = [];

    if (options.module) {
      params.push('module=' + options.module);
    }

    if (options.filter) {
      params.push('filter=' + options.filter.toLowerCase());
    }

    if (options.query) {
      params.push(options.query);
    }

    return params.join('&');
  },

  run: function(commandOptions) {
  }
});
