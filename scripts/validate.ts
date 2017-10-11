/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Logger, tags } from '@angular-devkit/core';
import { execSync } from 'child_process';
import templates from './templates';
import validateCommits from './validate-commits';

export default function (_: {}, logger: Logger) {
  logger.info('Running templates validation...');

  if (execSync(`git status --porcelain`).toString()) {
    logger.fatal('There are local changes...');
    process.exit(1);
  }
  templates({}, logger.createChild('templates'));
  if (execSync(`git status --porcelain`).toString()) {
    logger.fatal(tags.oneLine`
      Running templates updated files... Please run "devkit-admin templates" before submitting
      a PR.
    `);
    process.exit(2);
  }

  logger.info('Running commit validation...');
  validateCommits({}, logger.createChild('validate-commits'));
}
