/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable: no-implicit-dependencies we import @angular-devkit/core but
// it is not in package.json, which is fine, this is just a script.

import { logging } from '@angular-devkit/core';
import { execSync } from 'child_process';
import { packages, stableToExperimentalVersion } from '../lib/packages';

interface DistTagOptions {
  /**
   * The version of CLI packages published to NPM.
   * Version must begin with d+.d+.d+ where d is a 0-9 digit.
   * For example, `1.2.3`, `10.0.0-next.0`, or `10.0.0-rc.0`.
   * Since we publish both stable and experimental packages to NPM, the version
   * provided here must be a stable version with major version > 0.
   * The script will automatically convert stable version to experimental for
   * experimental packages.
   */
  version: string;
  /**
   * Tag is usually "latest" or "next", but could also be "v10-lts" for example.
   */
  tag: string;
  /**
   * If true, prints the help message.
   */
  help: boolean;
}

/**
 * This function adds a tag to all public packages in the CLI repo.
 */
export default function(args: Partial<DistTagOptions>, logger: logging.Logger) {
  if (args.help) {
    logger.info(`dist-tag adds a tag to all public packages in the CLI repo.

If the packages already have a tag associated with them, then dist-tag will
retag the packages.

Usage:
  --version  the version of CLI packages published to NPM.
  --tag      the tag to add to CLI packages`);

    return;
  }
  const {version, tag} = args;
  if (!version || version.startsWith('v')) {
    throw new Error('Version must be specified in format d+.d+.d+');
  }
  if (version.startsWith('0')) {
    throw new Error(`Major version must be > 0, did you mean ${stableToExperimentalVersion(version)}?`);
  }
  if (!tag) {
    throw new Error('Tag must be non-empty, for example: latest, next, v10-lts, etc');
  }
  const publicPackages = Object.values(packages).filter(p => !p.private);
  for (const {name, experimental} of publicPackages) {
    const actualVersion = experimental ? stableToExperimentalVersion(version) : version;
    // See https://docs.npmjs.com/cli/dist-tag for documentation
    const cmd = `npm dist-tag add '${name}@${actualVersion}' '${tag}'`;
    logger.debug(cmd);  // print debug output by specifying --verbose
    const output = execSync(cmd, { encoding: 'utf8' });
    logger.info(output.trim());
  }
}
