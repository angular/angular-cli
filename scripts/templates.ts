/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import * as fs from 'fs';
import * as path from 'path';
import { packages } from '../lib/packages';

export default function(_options: {}, logger: logging.Logger) {
  const monorepo = require('../.monorepo.json');

  logger.info('Building README...');
  const readme = require('./templates/readme').default;
  const content = readme({
    monorepo,
    packages,
    encode: (x: string) => global.encodeURIComponent(x),
  });
  fs.writeFileSync(path.join(__dirname, '../README.md'), content, 'utf-8');
}
