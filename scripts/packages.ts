/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { logging } from '@angular-devkit/core';


const { packages } = require('../lib/packages');


export default function(args: { json: boolean, version: boolean }, logger: logging.Logger) {
  if (args.json) {
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
