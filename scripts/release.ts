/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Logger} from '@angular-devkit/core';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';

const crypto = require('crypto');
const tar = require('tar');
const { hashes, versions } = require('../versions.json');
const { packages } = require('../lib/packages');


function _getHashOf(path: string): string {
  // This is all synchronous streams.
  const input = tar.create({
    sync: true,
    gzip: false,
    strict: true,
    portable: true,
    cwd: path,
  }, ['.']);
  const output = crypto.createHash('md5');
  input.on('error', (err: Error) => {
    throw err;
  });

  let md5 = '';
  output.once('readable', function () {
    md5 = output.read().toString('hex');
  });

  input.pipe(output);

  return md5;
}


function _showVersions(logger: Logger) {
  for (const pkg of Object.keys(versions)) {
    if (!(pkg in packages)) {
      logger.fatal(`"${pkg}" not an official package...`);
    }

    const version = versions[pkg] || '???';
    const hash = _getHashOf(packages[pkg].root);
    const diff = hashes[pkg] !== hash ? '!' : '';

    const pad1 = '                                  '.slice(pkg.length);
    const pad2 = '          '.slice(version.length);
    const message = `${pkg} ${pad1}v${version}${pad2}${hash} ${diff}`;
    if (packages[pkg].private) {
      logger.debug(message);
    } else {
      logger.info(message);
    }
  }
}


function _upgrade(release: string, logger: Logger) {
  for (const pkg of Object.keys(packages)) {
    if (!(pkg in versions)) {
      versions[pkg] = '0.0.0';
    }

    const hash = _getHashOf(packages[pkg].root);
    const version = versions[pkg];
    let newVersion = version;

    if (release == 'minor-beta') {
      if (hash !== hashes[pkg]) {
        if (version.match(/-beta\.\d+$/)) {
          newVersion = semver.inc(version, 'prerelease');
        } else {
          newVersion = semver.inc(version, 'minor') + '-beta.0';
        }
      }
    } else if (release == 'minor-rc') {
      if (hash !== hashes[pkg]) {
        if (version.match(/-rc/)) {
          newVersion = semver.inc(version, 'prerelease');
        } else if (version.match(/-beta\.\d+$/)) {
          newVersion = version.replace(/-beta\.\d+$/, '-rc.0');
        } else {
          newVersion = semver.inc(version, 'minor') + '-rc.0';
        }
      }
    } else if (release == 'major-beta') {
      if (hash !== hashes[pkg]) {
        if (version.match(/-beta\.\d+$/)) {
          newVersion = semver.inc(version, 'prerelease');
        } else {
          newVersion = semver.inc(version, 'major') + '-beta.0';
        }
      }
    } else if (release == 'major-rc') {
      if (hash !== hashes[pkg]) {
        if (version.match(/-rc/)) {
          newVersion = semver.inc(version, 'prerelease');
        } else if (version.match(/-beta\.\d+$/)) {
          newVersion = version.replace(/-beta\.\d+$/, '-rc.0');
        } else {
          newVersion = semver.inc(version, 'major') + '-rc.0';
        }
      }
    } else if (hash !== hashes[pkg] || release !== 'patch') {
      newVersion = semver.inc(version, release);
    }

    if (version !== newVersion) {
      logger.info(`${pkg} changed... updating v${version} => v${newVersion}`);

      versions[pkg] = newVersion;
      hashes[pkg] = hash;
    }
  }
}


export default function(args: { _: string[], 'dry-run'?: boolean }, logger: Logger) {
  const maybeRelease = args._.shift();
  const dryRun = args['dry-run'] !== undefined;
  switch (maybeRelease) {
    case undefined:
      _showVersions(logger);
      process.exit(0);
      break;

    case 'major-beta':
    case 'major-rc':
    case 'minor-beta':
    case 'minor-rc':
    case 'major':
    case 'minor':
    case 'patch':
      _upgrade(maybeRelease, logger);
      if (!dryRun) {
        fs.writeFileSync(path.join(__dirname, '../versions.json'),
                         JSON.stringify({ versions, hashes }, null, 2) + '\n');
      }
      process.exit(0);
      break;
  }
}
