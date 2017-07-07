/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Logger} from '@angular-devkit/core';
import {execSync} from 'child_process';
import {packages} from '../lib/packages';


export default function (_: {}, logger: Logger) {
  logger.info('Getting merge base...');

  const parentBranch = process.env['CIRCLE_BRANCH'] || 'master';
  const mergeBase = execSync(`git merge-base --fork-point ${parentBranch}`).toString().trim();
  logger.info('  SHA: ' + mergeBase);

  const log = execSync(`git log --oneline "${mergeBase}.."`).toString().trim();
  const commits = log.split(/\n/)
    .map(i => i.match(/(^[0-9a-f]+) (.+)$/))
    .filter(x => !!x)
    .map(x => Array.from(x !));
  logger.info(`Found ${commits.length} commits...`);

  const output = new Logger('check', logger);
  let invalidCount = 0;

  function _invalid(sha: string, message: string, error: string) {
    invalidCount++;
    output.error(`The following commit ${error}:`);
    output.error(`  ${sha} ${message}`);
  }

  for (const [sha, message] of commits) {
    const subject = message.match(/^([^:(]+)(?:\((.*?)\))?:/);
    if (!subject) {
      _invalid(sha, message, 'does not have a subject');
      continue;
    }

    const [type, scope] = subject.slice(1);
    switch (type) {
      // Types that can contain both a scope or no scope.
      case 'docs':
      case 'refactor':
      case 'style':
      case 'test':
        if (scope && !packages[scope]) {
          _invalid(sha, message, 'has a scope that does not exist');
          continue;
        }
        break;

      // Types that MUST contain a scope.
      case 'feat':
      case 'fix':
        if (!scope) {
          _invalid(sha, message, 'should always have a scope');
          continue;
        }
        if (!packages[scope]) {
          _invalid(sha, message, 'has a scope that does not exist');
          continue;
        }
        break;

      // Types that MUST NOT contain a scope.
      case 'build':
      case 'ci':
        if (scope) {
          _invalid(sha, message, 'should not have a scope');
          continue;
        }
        break;

      // Unknown types.
      default:
        _invalid(sha, message, 'has an unknown type');
    }
  }

  if (invalidCount > 0) {
    logger.fatal(`${invalidCount} commits were found invalid...`);
    process.exit(1);
  } else {
    logger.info('All green. Thank you, come again.');
  }
}
