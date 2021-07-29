/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging, tags } from '@angular-devkit/core';
import { spawnSync } from 'child_process';
import * as semver from 'semver';
import { packages } from '../lib/packages';
import build from './build';

export interface PublishArgs {
  tag?: string;
  tagCheck?: boolean;
  branchCheck?: boolean;
  versionCheck?: boolean;
  registry?: string;
}

function _exec(command: string, args: string[], opts: { cwd?: string }, logger: logging.Logger) {
  if (process.platform.startsWith('win')) {
    args.unshift('/c', command);
    command = 'cmd.exe';
  }

  const { status, error, stderr, stdout } = spawnSync(command, args, { ...opts });

  if (status != 0) {
    logger.error(`Command failed: ${command} ${args.map((x) => JSON.stringify(x)).join(', ')}`);
    if (error) {
      logger.error('Error: ' + (error ? error.message : 'undefined'));
    } else {
      logger.error(`STDERR:\n${stderr}`);
    }
    throw error;
  } else {
    return stdout.toString();
  }
}

/** Returns whether or not the given tag is valid to be used. */
function _tagCheck(tag: string) {
  if (tag === 'latest') {
    return; // Valid
  }
  if (tag === 'next') {
    return; // Valid
  }
  if (/v\d+-lts/.test(tag)) {
    return; // Valid
  }

  throw new Error(tags.oneLine`
    --tag should be "latest", "next", or "vX-lts". Use \`--no-tagCheck false\`
    to skip this check if necessary.
  `);
}

function _branchCheck(args: PublishArgs, logger: logging.Logger) {
  logger.info('Checking branch...');
  const ref = _exec('git', ['symbolic-ref', 'HEAD'], {}, logger);
  const branch = ref.trim().replace(/^refs\/heads\//, '');

  switch (branch) {
    case 'master':
      if (args.tag !== 'next') {
        throw new Error(tags.oneLine`
          Releasing from master requires a next tag. Use --no-branchCheck to
          skip this check.
        `);
      }
  }
}

function _versionCheck(args: PublishArgs, logger: logging.Logger) {
  logger.info('Checking version...');
  // Find _any_ version that's beta or RC.
  let betaOrRc = false;
  let version = '';
  Object.keys(packages).forEach((name: string) => {
    // If there's _ANY_ prerelease information, it's on.
    if (semver.prerelease(packages[name].version)) {
      betaOrRc = true;
      version = packages[name].version;
    }
  });

  if (betaOrRc && args.tag !== 'next') {
    throw new Error(tags.oneLine`
      Releasing version ${JSON.stringify(version)} requires a next tag.
      Use --no-versionCheck to skip this check.
    `);
  }

  Object.keys(packages).forEach((name: string) => {
    if (packages[name].version.indexOf('+') >= 0) {
      throw new Error(tags.oneLine`
        Releasing a version with a + in it means that the latest commit is not tagged properly.
        Version found: ${JSON.stringify(packages[name].version)}
      `);
    }
  });
}

export default async function (args: PublishArgs, logger: logging.Logger) {
  const { tag } = args;
  if (!tag) {
    // NPM requires that all releases have a tag associated.
    // https://github.com/npm/npm/issues/10625#issuecomment-162106553
    // Do not publish without a tag.
    throw new Error('--tag is required.');
  }

  if (args.tagCheck ?? true) {
    _tagCheck(tag);
  }

  if (args.branchCheck ?? true) {
    _branchCheck(args, logger);
  }

  if (args.versionCheck ?? true) {
    _versionCheck(args, logger);
  }

  // If no registry is provided, the wombat proxy should be used.
  const registry = args.registry ?? 'http://localhost:4873/';

  logger.info('Building...');
  await build({}, logger.createChild('build'));

  return Object.keys(packages)
    .reduce((acc: Promise<void>, name: string) => {
      const pkg = packages[name];
      if (pkg.packageJson['private']) {
        logger.debug(`${name} (private)`);

        return acc;
      }

      return acc
        .then(() => {
          logger.info(name);

          const publishArgs = ['publish', '--tag', tag, '--registry', registry];

          return _exec(
            'npm',
            publishArgs,
            {
              cwd: pkg.dist,
            },
            logger,
          );
        })
        .then((stdout: string) => {
          logger.info(stdout);
        });
    }, Promise.resolve())
    .then(
      () => logger.info('done'),
      (err: Error) => logger.fatal(err.message),
    );
}
