#!/usr/bin/env node
'use strict';

const minimist = require('minimist');
const tools = require('../lib/packages').tools;

const argv = minimist(process.argv.slice(2));
const scriptName = argv._[0];

if (!tools[scriptName]) {
  // eslint-disable-next-line no-console
  console.error(`Tool "${scriptName}" unknown.`);
  process.exit(1);
}

const mainTs = tools[scriptName].mainTs;
process.argv.splice(1, 2, mainTs);

require('../lib/bootstrap-local');
require(mainTs);
