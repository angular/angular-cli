/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { logging, tags } from '@angular-devkit/core';
import { execSync } from 'child_process';
import templates from './templates';
import validateBuildFiles from './validate-build-files';
import validateCommits from './validate-commits';
import validateLicenses from './validate-licenses';

export default function (options: { verbose: boolean }, logger: logging.Logger) {
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


  logger.info('');
  logger.info('Running license validation...');
  validateLicenses({}, logger.createChild('validate-commits'));

  logger.info('');
  logger.info('Running BUILD files validation...');
  validateBuildFiles({}, logger.createChild('validate-build-files'));

  if (error) {
    process.exit(101);
  }
}
