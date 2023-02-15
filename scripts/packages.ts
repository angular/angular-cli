/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import * as colors from 'ansi-colors';

const { packages, loadRootPackageJson, stableToExperimentalVersion } = require('../lib/packages');

export default function (
  args: { json: boolean; version: boolean; releaseCheck: boolean },
  logger: logging.Logger,
) {
  if (args.releaseCheck) {
    const { version: root } = loadRootPackageJson();
    const experimental = stableToExperimentalVersion(root);
    logger.info(
      `The expected version for the release is ${colors.bold(
        root,
      )} (${experimental}) based on root package.json.`,
    );
    logger.info(
      Object.keys(packages)
        .filter((name) => !packages[name].private)
        .map((name) => {
          let result = colors.red(colors.symbols.cross);
          const version = packages[name].version;
          if ([root, experimental].includes(version)) {
            result = colors.green(colors.symbols.check);
          }

          return ` ${result}  ${name}@${packages[name].version}`;
        })
        .join('\n'),
    );
  } else if (args.json) {
    logger.info(JSON.stringify(packages, null, 2));
  } else {
    logger.info(
      Object.keys(packages)
        .filter((name) => !packages[name].private)
        .map((name) => {
          if (args.version) {
            return `${name}@${packages[name].version}`;
          } else {
            return name;
          }
        })
        .join('\n'),
    );
  }
}
