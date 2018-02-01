#!/usr/bin/env node

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * GIT commit message format enforcement
 *
 * Note: this script was originally written by Vojta for AngularJS :-)
 */

/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, './commit-message.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const { packages, tools } = require('../../lib/packages');
const PATTERN = /^(revert\: )?(\w+)(?:\(([^)]+)\))?\: (.+)$/;

module.exports = function(commitSubject) {
  if (commitSubject.length > config['maxLength']) {
    error(`The commit message is longer than ${config['maxLength']} characters`, commitSubject);
    return false;
  }

  const match = PATTERN.exec(commitSubject);
  if (!match || match[2] === 'revert') {
    error('The commit message does not match the format of "<type>(<scope>): <subject> '
        + 'OR revert: type(<scope>): <subject>"', commitSubject);
    return false;
  }

  const type = match[2];
  const types = Object.keys(config['types']);
  if (types.indexOf(type) === -1) {
    error(`"${type}" is not an allowed type.\n => TYPES: "${types.join('", "')}"`, commitSubject);
    return false;
  }

  const scope = match[3];
  const allScopes = Object.keys(packages).concat(Object.keys(tools));

  if (scope && !allScopes.includes(scope)) {
    error(`"${scope}" is not an allowed scope.\n => SCOPES: ${allScopes.join(', ')}`,
        commitSubject);
    return false;
  }

  // Having a tool scope and not using tool() is an error.
  if (scope && Object.keys(tools).includes(scope) && type !== 'tool') {
    error(`"${scope}" is a tool, but the type is NOT "tool".`);
    return false;
  }

  // Having a package scope and using tool() is an error.
  if (scope && Object.keys(tools).includes(scope) && type !== 'tool') {
    error(`"${scope}" is NOT a tool, but the type is "tool".`);
    return false;
  }

  return true;
};

function error(errorMessage, commitMessage) {
  console.error(`INVALID COMMIT MSG: "${commitMessage}"\n => ERROR: ${errorMessage}`);
}
