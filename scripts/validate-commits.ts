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
import { packages } from '../lib/packages';


const ignoreCommitShaList = [
  '9ce1aed331ad0742463b587f1f5555486ccc202f',
  'de7a44f23514594274394322adaf40ac87c38d8b',
  '21d87e93955b12d137417a2bb0536d7faef3ad07',
  '76a3ec3fea0482e15851dda1c61bb90b8c643bb7',
  '09d019e73308f6914a94f99284f7d54063da420e',
  '012672161087a05ae5ecffbed5d1ee307ce1e0ad',
  'dd39597b6a061100cce16494613332368b0f2553',
  'a11dddf454590c8df7e8fbc500e589eafbcb48fe',
  '9a9bc00a453988469b12a434372021a812e11223',
  '167f6fb95843e80a650ff948361c8c24bfc302d8',
  'fb1c2af810d069229760800c2f539e8a764fe1eb',
  '7ba94c8084eb65407abd5531dcbb7275401969c9',
  '8475b3dadba3d50a96a2f876188bbf78d55039aa',
  'bf566c710181b0e23af0070540294de99f259fe9',
  'fa6795a8471d1c9ae4d583f8e698e49f74a137e6',
];


export enum Scope {
  MustHave = 0,
  MustNotHave = 1,
  Either = 2,
}

export const types: { [t: string]: { description: string, scope: Scope } } = {
  // Types that can contain both a scope or no scope.
  'docs': {
    description: 'Documentation only changes.',
    scope: Scope.Either,
  },
  'refactor': {
    description: 'A code change that neither fixes a bug nor adds a feature',
    scope: Scope.Either,
  },
  'style': {
    description: 'Changes that do not affect the meaning of the code (white-space, formatting, '
               + 'missing semi-colons, etc).',
    scope: Scope.Either,
  },
  'test': {
    description: 'Adding missing tests or correcting existing tests.',
    scope: Scope.Either,
  },

  // Types that MUST contain a scope.
  'feat': {
    description: 'A new feature.',
    scope: Scope.MustHave,
  },
  'fix': {
    description: 'A bug fix.',
    scope: Scope.MustHave,
  },

  // Types that MUST NOT contain a scope.
  'build': {
    description: 'Changes that affect the build system or external dependencies.',
    scope: Scope.MustNotHave,
  },
  'revert': {
    description: 'A git commit revert. The description must include the original commit message.',
    scope: Scope.MustNotHave,
  },
  'ci': {
    description: 'Changes to our CI configuration files and scripts.',
    scope: Scope.MustNotHave,
  },
  'release': {
    description: 'A release commit. Must only include version changes.',
    scope: Scope.MustNotHave,
  },
};


export interface ValidateCommitsOptions {
  ci?: boolean;
  base?: string;
  head?: string;
}


export default function (argv: ValidateCommitsOptions, logger: logging.Logger) {
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

  const log = execSync(`git log --oneline "${baseSha}..${sha}"`).toString().trim();
  logger.debug('Commits:');
  logger.createChild('commits').debug(log);
  logger.debug('');

  const commits = log.split(/\n/)
    .map(i => i.match(/(^[0-9a-f]+) (.+)$/))
    .map(x => x ? Array.from(x).slice(1) : null)
    .filter(x => !!x) as [string, string][];
  logger.info(`Found ${commits.length} commits...`);

  const output = logger.createChild('check');
  let invalidCount = 0;

  function _invalid(sha: string, message: string, error: string) {
    invalidCount++;
    output.error(`The following commit ${error}:`);
    output.error(`  ${sha} ${message}`);
  }

  for (const [sha, message] of commits) {
    if (ignoreCommitShaList.find(i => i.startsWith(sha))) {
      // Some commits are better ignored.
      continue;
    }

    const subject = message.match(/^([^:(]+)(?:\((.*?)\))?:/);
    if (!subject) {
      _invalid(sha, message, 'does not have a subject');
      continue;
    }

    const [type, scope] = subject.slice(1);
    if (!(type in types)) {
      _invalid(sha, message, 'has an unknown type. You can use wip: to avoid this.');
      continue;
    }
    switch (types[type].scope) {
      case Scope.Either:
        if (scope && !packages[scope]) {
          _invalid(sha, message, 'has a scope that does not exist');
          continue;
        }
        break;

      case Scope.MustHave:
        if (!scope) {
          _invalid(sha, message, 'should always have a scope');
          continue;
        }
        if (!packages[scope]) {
          _invalid(sha, message, 'has a scope that does not exist');
          continue;
        }
        break;

      case Scope.MustNotHave:
        if (scope) {
          _invalid(sha, message, 'should not have a scope');
          continue;
        }
        break;
    }

    // Custom validation.
    if (type == 'release') {
      if (argv.ci && commits.length > 1) {
        _invalid(sha, message, 'release should always be alone in a PR');
        continue;
      }
    } else if (type == 'wip') {
      if (argv.ci) {
        _invalid(sha, message, 'wip are not allowed in a PR');
      }
    }
  }

  if (invalidCount > 0) {
    logger.fatal(`${invalidCount} commits were found invalid...`);
  } else {
    logger.info('All green. Thank you, come again.');
  }

  return invalidCount;
}
