/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { logging } from '@angular-devkit/core';
import { execSync } from 'child_process';


export interface ValidateCommitsOptions {
  ci?: boolean;
  base?: string;
  head?: string;
}


export default async function (argv: ValidateCommitsOptions, logger: logging.Logger) {
  logger.info('Getting merge base...');

  const prNumber = process.env['CIRCLE_PR_NUMBER'] || '';
  let baseSha = '';
  let sha = '';

  if (prNumber) {
    const url = `https://api.github.com/repos/angular/angular-cli/pulls/${prNumber}`;
    const prJson = JSON.parse(execSync(`curl "${url}"`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).toString());
    baseSha = prJson['base']['sha'];
    sha = prJson['head']['sha'];
  } else if (argv.base) {
    baseSha = argv.base;
    sha = argv.head || 'HEAD';
  } else {
    const parentRemote = process.env['GIT_REMOTE'] ? process.env['GIT_REMOTE'] + '/' : '';
    const parentBranch = process.env['GIT_BRANCH'] || 'master';
    baseSha = execSync(`git merge-base --fork-point "${parentRemote}${parentBranch}"`)
      .toString().trim();
    sha = 'HEAD';
  }

  logger.createChild('sha').info(`Base: ${baseSha}\nHEAD: ${sha}`);

  const diffFiles = execSync(`git diff --name-only "${baseSha}..${sha}"`).toString().trim();
  const files = diffFiles.split(/\n/);
  let errorCount = 0;

  for (const fileName of files) {
    const diff = execSync(`git diff "${baseSha}..${sha}" -- "${fileName}"`, {
      // Increase the default buffer size by 100. Diffs can be quite large.
      maxBuffer: 100 * 1024 * 1024,
    }).toString().trim();

    // This does not trigger itself because of the `b` in `\bDO_`...
    if (diff.match(/\bDO_NOT_SUBMIT\b/)) {
      // Use a workaround to prevent triggering itself.
      logger.error(`DO_NOT${''}_SUBMIT token found in ${JSON.stringify(fileName)}.`);

      errorCount++;
    }
  }

  logger.info('');
  if (errorCount > 0) {
    logger.fatal(`${errorCount} file${errorCount > 1 ? 's' : ''} need to be fixed...`);
  } else {
    logger.info('All green. Thank you, come again.');
  }

  return errorCount;
}
