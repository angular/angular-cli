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
import validateDoNotSubmit from './validate-do-not-submit';
import validateLicenses from './validate-licenses';
import validateUserAnalytics from './validate-user-analytics';

export default async function (options: { verbose: boolean }, logger: logging.Logger) {
  let error = false;

  if (execSync(`git status --porcelain`).toString()) {
    logger.error('There are local changes.');
    if (!options.verbose) {
      return 101;
    }
    error = true;
  }

  logger.info('Running templates validation...');
  const templateLogger = logger.createChild('templates');
  await templates({}, templateLogger);
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
  error = validateCommits({}, logger.createChild('validate-commits')) != 0
       || error;

  logger.info('');
  logger.info(`Running DO_NOT${''}_SUBMIT validation...`);
  error = await validateDoNotSubmit({}, logger.createChild('validate-do-not-submit')) != 0
       || error;

  logger.info('');
  logger.info('Running license validation...');
  error = await validateLicenses({}, logger.createChild('validate-commits')) != 0
       || error;

  logger.info('');
  logger.info('Running BUILD files validation...');
  error = await validateBuildFiles({}, logger.createChild('validate-build-files')) != 0
       || error;

  logger.info('');
  logger.info('Running User Analytics validation...');
  error = await validateUserAnalytics({}, logger.createChild('validate-user-analytics')) != 0
    || error;

  if (error) {
    return 101;
  }

  return 0;
}
