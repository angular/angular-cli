#!/usr/bin/env node
'use strict';

require('../lib/bootstrap-local');
const glob = require('glob');

const path = require('path');
const Jasmine = require('jasmine');

const projectBaseDir = path.join(__dirname, '../packages');

// Create a Jasmine runner and configure it.
const jasmine = new Jasmine({ projectBaseDir: projectBaseDir });
jasmine.loadConfig({});
// Manually set exit code (needed with custom reporters)
jasmine.onComplete((success) => process.exitCode = !success);

// Run the tests.
const allTests =
  glob.sync('packages/**/*.spec.ts')
    .map(p => path.relative(projectBaseDir, p))
    .filter(p => !/blueprints/.test(p));

jasmine.execute(allTests);
