/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { logging } from '@angular-devkit/core';
import chalk from 'chalk';

const { packages, loadRootPackageJson, stableToExperimentalVersion } = require('../lib/packages');


export default function(args: { json: boolean, version: boolean, releaseCheck: boolean }, logger: logging.Logger) {

  if (args.releaseCheck) {
    const {version: root} = loadRootPackageJson();
    const experimental = stableToExperimentalVersion(root);
    logger.info(`The expected version for the release is ${chalk.bold(root)} (${experimental})`);
    logger.info(
      Object.keys(packages)
        .filter(name => !packages[name].private)
        .map(name => {
          let result = chalk.red('✘');
          const version = packages[name].version;
          if ([root, experimental].includes(version)) {
            result = chalk.green('✓');
          }

          return ` ${result}  ${name}@${packages[name].version}`;
        })
        .join('\n'));
  } else if (args.json) {
    logger.info(JSON.stringify(packages, null, 2));
  } else {
    logger.info(
      Object.keys(packages)
        .filter(name => !packages[name].private)
        .map(name => {
          if (args.version) {
            return `${name}@${packages[name].version}`;
          } else {
            return name;
          }
        })
        .join('\n'));
  }
}
