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

export default function (options: { verbose: boolean }, logger: Logger) {
  let error = false;

  logger.info('Running templates validation...');
  const templateLogger = logger.createChild('templates');
  if (execSync(`git status --porcelain`).toString()) {
    logger.error('There are local changes.');
    if (!options.verbose) {
      process.exit(1);
    }
    error = true;
  }
  templates({}, templateLogger);
  if (execSync(`git status --porcelain`).toString()) {
    logger.error(tags.oneLine`
      Running templates updated files... Please run "devkit-admin templates" before submitting
      a PR.
    `);
    if (!options.verbose) {
      process.exit(2);
    }
    error = true;
  }

  logger.info('');
  logger.info('Running commit validation...');
  validateCommits({}, logger.createChild('validate-commits'));

  if (error) {
    process.exit(101);
  }
}
