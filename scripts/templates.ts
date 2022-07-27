/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import * as fs from 'fs';
import * as path from 'path';

async function _runTemplate(inputPath: string, outputPath: string, logger: logging.Logger) {
  inputPath = path.resolve(__dirname, inputPath);
  outputPath = path.resolve(__dirname, outputPath);

  logger.info(`Building ${path.relative(path.dirname(__dirname), outputPath)}...`);

  // TODO(ESM): Consider making this an actual import statement.
  const { COMMIT_TYPES, ScopeRequirement } = await new Function(
    `return import('@angular/ng-dev');`,
  )();

  const template = require(inputPath).default;
  const content = template({
    monorepo: require('../.monorepo.json'),
    packages: require('../lib/packages').packages,
    encode: (x: string) => global.encodeURIComponent(x),
    require: (x: string) => require(path.resolve(path.dirname(inputPath), x)),

    // Pass-through `ng-dev` ESM commit message information for the `contributing.ejs`
    // template. EJS templates using the devkit template cannot use ESM.
    COMMIT_TYPES: COMMIT_TYPES,
    ScopeRequirement: ScopeRequirement,
  });
  fs.writeFileSync(outputPath, content, 'utf-8');
}

export default async function (_options: {}, logger: logging.Logger): Promise<number> {
  await _runTemplate('./templates/readme', '../README.md', logger);
  await _runTemplate('./templates/contributing', '../CONTRIBUTING.md', logger);

  return 0;
}
