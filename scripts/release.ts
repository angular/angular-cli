/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Logger } from '@angular-devkit/core';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import { ReleaseType } from 'semver';
import { packages } from '../lib/packages';


const monorepo = require('../.monorepo.json');


function _showVersions(logger: Logger) {
  for (const pkgName of Object.keys(packages)) {
    const pkg = packages[pkgName];

    const version = pkg.version || '???';
    const hash = pkg.hash;
    const diff = pkg.dirty ? '!' : '';

    const pad1 = '                                  '.slice(pkgName.length);
    const pad2 = '          '.slice(version.length);
    const message = `${pkgName} ${pad1}v${version}${pad2}${hash} ${diff}`;
    if (pkg.private) {
      logger.debug(message);
    } else {
      logger.info(message);
    }
  }
}


function _upgrade(release: string, logger: Logger) {
  for (const pkg of Object.keys(packages)) {
    const hash = packages[pkg].hash;
    const version = packages[pkg].version;
    const dirty = packages[pkg].dirty;
    let newVersion: string | null = version;

    if (release == 'minor-beta') {
      if (dirty) {
        if (version.match(/-beta\.\d+$/)) {
          newVersion = semver.inc(version, 'prerelease');
        } else {
          newVersion = semver.inc(version, 'minor') + '-beta.0';
        }
      }
    } else if (release == 'minor-rc') {
      if (dirty) {
        if (version.match(/-rc/)) {
          newVersion = semver.inc(version, 'prerelease');
        } else if (version.match(/-beta\.\d+$/)) {
          newVersion = version.replace(/-beta\.\d+$/, '-rc.0');
        } else {
          newVersion = semver.inc(version, 'minor') + '-rc.0';
        }
      }
    } else if (release == 'major-beta') {
      if (dirty) {
        if (version.match(/-beta\.\d+$/)) {
          newVersion = semver.inc(version, 'prerelease');
        } else {
          newVersion = semver.inc(version, 'major') + '-beta.0';
        }
      }
    } else if (release == 'major-rc') {
      if (dirty) {
        if (version.match(/-rc/)) {
          newVersion = semver.inc(version, 'prerelease');
        } else if (version.match(/-beta\.\d+$/)) {
          newVersion = version.replace(/-beta\.\d+$/, '-rc.0');
        } else {
          newVersion = semver.inc(version, 'major') + '-rc.0';
        }
      }
    } else if (dirty || release !== 'patch') {
      newVersion = semver.inc(version, release as ReleaseType);
    }

    let message = '';
    if (!(pkg in monorepo.packages)) {
      message = `${pkg} is new... setting v${newVersion}`;
      monorepo.packages[pkg] = {
        version: newVersion,
        hash: hash,
      };
    } else if (newVersion && version !== newVersion) {
      message = `${pkg} changed... updating v${version} => v${newVersion}`;
      monorepo.packages[pkg].version = newVersion;
      monorepo.packages[pkg].hash = hash;
    } else {
      message = `${pkg} SAME: v${version}`;
    }

    if (packages[pkg].private) {
      logger.debug(message);
    } else {
      logger.info(message);
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
        fs.writeFileSync(path.join(__dirname, '../.monorepo.json'),
                         JSON.stringify(monorepo, null, 2) + '\n');
      }
      process.exit(0);
      break;
  }
}
