/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable: no-implicit-dependencies

import { logging } from '@angular-devkit/core';
import { execSync } from 'child_process';
import { packages, stableToExperimentalVersion } from '../lib/packages';

interface DistTagOptions {
  /**
   * Version must be specified in format d+.d+.d+ where d is a 0-9 digit.
   * This must be a stable version with major version > 0.
   * The script will automatically convert stable version to experimental.
   */
  version: string;
  /**
   * Tag is usually "latest" or "next", but could also be "v10-lts" for example.
   */
  tag: string;
}

/**
 * This function adds a tag to all public packages in the CLI repo.
 */
export default function(args: DistTagOptions, logger: logging.Logger) {
  const {version, tag} = args;
  if (!version || version.startsWith('v')) {
    throw new Error('Version must be specified in format d+.d+.d+');
  }
  if (version.startsWith('0')) {
    throw new Error('Version must be "stable", with major version > 0');
  }
  if (!tag) {
    throw new Error('Tag must be non-empty, for example: latest, next, v10-lts, etc');
  }
  const publicPackages = Object.values(packages).filter(p => !p.private);
  for (const {name, experimental} of publicPackages) {
    const actualVersion = experimental ? stableToExperimentalVersion(version) : version;
    // See https://docs.npmjs.com/cli/dist-tag for documentation
    const cmd = `npm dist-tag add ${name}@${actualVersion} ${tag}`;
    logger.debug(cmd);  // print debug output by specifying --verbose
    const output = execSync(cmd, { encoding: 'utf8' });
    logger.info(output.trim());
  }
}
