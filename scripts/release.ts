/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { logging } from '@angular-devkit/core';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import { packages } from '../lib/packages';


const monorepo = require('../.monorepo.json');


function _showVersions(logger: logging.Logger) {
  const versions = Object.keys(packages).reduce((acc, curr) => {
    acc[curr] = packages[curr] && packages[curr].version || '???';

    return acc;
  }, {} as { [pkg: string]: string });
  const maxVersionLength = Math.max(...Object.keys(versions).map(x => versions[x].length));

  for (const pkgName of Object.keys(packages)) {
    const pkg = packages[pkgName];

    const version = pkg.version || '???';

    const pad1 = '                                       '.slice(pkgName.length);
    const message = `${pkgName} ${pad1}${('      ' + version).slice(-maxVersionLength)}`;
    if (pkg.private) {
      logger.debug(message);
    } else {
      logger.info(message);
    }
  }
}


function _upgradeSingle(release: string, version: string): string {
  const simpleVersion = version.replace(/-beta\.\d+$|-rc\.\d+$/, '');
  const isExperimental = semver.satisfies(simpleVersion, '<1.0.0');

  if (release == 'minor-beta') {
    if (version.match(/-beta\.\d+$/)) {
      return semver.inc(version, 'prerelease') || version;
    } else {
      return semver.inc(version, 'minor') ? semver.inc(version, 'minor') + '-beta.0' : version;
    }
  } else if (release == 'minor-rc') {
    if (version.match(/-rc/)) {
      return semver.inc(version, 'prerelease') || version;
    } else if (version.match(/-beta\.\d+$/)) {
      return version.replace(/-beta\.\d+$/, '-rc.0');
    } else {
      return semver.inc(version, 'minor') ? semver.inc(version, 'minor') + '-rc.0' : version;
    }
  } else if (release == 'major-beta') {
    if (version.match(/-beta\.\d+$/)) {
      return semver.inc(version, 'prerelease') || version;
    } else if (isExperimental) {
      return semver.inc(version, 'minor') ? semver.inc(version, 'minor') + '-beta.0' : version;
    } else {
      return semver.inc(version, 'major') ? semver.inc(version, 'major') + '-beta.0' : version;
    }
  } else if (release == 'major-rc') {
    if (version.match(/-rc/)) {
      return semver.inc(version, 'prerelease') || version;
    } else if (version.match(/-beta\.\d+$/)) {
      return version.replace(/-beta\.\d+$/, '-rc.0');
    } else if (isExperimental) {
      return semver.inc(version, 'minor') ? semver.inc(version, 'minor') + '-rc.0' : version;
    } else {
      return semver.inc(version, 'major') ? semver.inc(version, 'major') + '-rc.0' : version;
    }
  } else if (release == 'major' && isExperimental) {
    return semver.inc(version, 'minor') || version;
  } else {
    return semver.inc(version, release as semver.ReleaseType) || version;
  }
}

function _upgrade(release: string, logger: logging.Logger) {
  // Update stable.
  const stable = monorepo.versions.stable;
  const experimental = monorepo.versions.experimental;
  if (!stable) {
    throw new Error('Should have a version.stable key.');
  }
  if (!experimental) {
    throw new Error('Should have a version.experimental key.');
  }
  const newStable = _upgradeSingle(release, stable);
  const newExperimental = _upgradeSingle(release, experimental);
  monorepo.versions = {
    stable: newStable,
    experimental: newExperimental,
  };

  logger.info(`Updated versions:`);
  logger.info(`     stable:       ${stable} => ${newStable}`);
  logger.info(`     experimental: ${experimental} => ${newExperimental}`);
}


export interface ReleaseOptions {
  _: string[];
  'dry-run'?: boolean;
}

export default function(args: ReleaseOptions, logger: logging.Logger) {
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
