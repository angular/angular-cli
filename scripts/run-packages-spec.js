#!/usr/bin/env node
'use strict';

require('../lib/bootstrap-local');

const path = require('path');
const Jasmine = require('jasmine');
const JasmineSpecReporter = require('jasmine-spec-reporter');

const packages = require('../lib/packages');

for (const pkgName of Object.keys(packages)) {
  const projectBaseDir = packages[pkgName].root;

  // Create a Jasmine runner and configure it.
  const jasmine = new Jasmine({projectBaseDir: projectBaseDir});
  jasmine.loadConfig({ spec_dir: projectBaseDir });
  jasmine.addReporter(new JasmineSpecReporter());

  // Run the tests.
  jasmine.execute(['**/*.spec.ts']);
}
