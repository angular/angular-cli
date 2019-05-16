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


function _runTemplate(inputPath: string, outputPath: string, logger: logging.Logger) {
  inputPath = path.resolve(__dirname, inputPath);
  outputPath = path.resolve(__dirname, outputPath);

  logger.info(`Building ${path.relative(path.dirname(__dirname), outputPath)}...`);

  const template = require(inputPath).default;
  const content = template({
    monorepo: require('../.monorepo.json'),
    packages: require('../lib/packages').packages,
    encode: (x: string) => global.encodeURIComponent(x),
    require: (x: string) => require(path.resolve(path.dirname(inputPath), x)),
  });
  fs.writeFileSync(outputPath, content, 'utf-8');
}

export default async function(_options: {}, logger: logging.Logger): Promise<number> {
  _runTemplate('./templates/readme', '../README.md', logger);
  _runTemplate('./templates/contributing', '../CONTRIBUTING.md', logger);

  return 0;
}
