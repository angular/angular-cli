#!/usr/bin/env node
'use strict';

// Check if the current directory contains '.angular-cli.json'. If it does, show a message to the user that they
// should use the migration script.

const fs = require('fs');
const path = require('path');
const os = require('os');


let found = false;
let current = path.dirname(path.dirname(__dirname));
while (current !== path.dirname(current)) {
  if (fs.existsSync(path.join(current, 'angular-cli.json'))
      || fs.existsSync(path.join(current, '.angular-cli.json'))) {
    found = os.homedir() !== current || fs.existsSync(path.join(current, 'package.json'));
    break;
  }
  if (fs.existsSync(path.join(current, 'angular.json'))
      || fs.existsSync(path.join(current, '.angular.json'))
      || fs.existsSync(path.join(current, 'package.json'))) {
    break;
  }

  current = path.dirname(current);
}


if (found) {
  // ------------------------------------------------------------------------------------------
  // If changing this message, please update the same message in
  // `packages/@angular/cli/models/command-runner.ts`

  // eslint-disable-next-line no-console
  console.error(`\u001b[31m
    ${'='.repeat(80)}
    The Angular CLI configuration format has been changed, and your existing configuration can
    be updated automatically by running the following command:

      ng update @angular/cli
    ${'='.repeat(80)}
    \u001b[39m`.replace(/^ {4}/gm, ''));
}
