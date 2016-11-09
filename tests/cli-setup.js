/* eslint-disable no-console */
'use strict';

require('../lib/bootstrap-local');

var path = require('path');

process.env.CLI_ROOT = process.env.CLI_ROOT || path.resolve(__dirname, '..');
