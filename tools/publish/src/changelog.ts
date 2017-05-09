/**
 * Just a small command-line wrapper around the conventional-changelog npm module
 * (https://www.npmjs.com/package/conventional-changelog), which also prepends
 * changes to CHANGELOG.md.
 *
 * Appends CHANGELOG.md with the changes between tag and HEAD.
 * NOTE: only `fix`, `feat`, `perf` and `revert` commits are used
 * see:
 * https://github.com/conventional-changelog/conventional-changelog/blob/v0.2.1/presets/angular.js
 */
import {Logger} from '@ngtools/logger';
import * as fs from 'fs';

const cl = require('conventional-changelog');
const exec = require('child_process').exec;

const changelogStream = fs.createWriteStream('CHANGELOG-delta.md');


const config = {
  preset: 'angular',
  releaseCount: 1
};

function prependDelta() {
  return exec(
    'cat CHANGELOG-delta.md CHANGELOG.md > CHANGELOG-new.md &&' +
    'mv CHANGELOG-new.md CHANGELOG.md &&' +
    'rm CHANGELOG-delta.md');
}


export default function changelog(args: string[], _opts: any, logger: Logger): void {
  if (args.length == 0) {
    logger.fatal('publish changelog <start-tag>');
    return;
  }

  cl(config, null, {from: args[0]})
    .on('error', function (err: Error) {
      logger.error('Failed to generate changelog: ' + err);
    })
    .pipe(changelogStream)
    .on('close', prependDelta);
}
