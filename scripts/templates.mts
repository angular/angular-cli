/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import lodash from 'lodash';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { releasePackages } from './packages.mjs';

const __dirname = import.meta.dirname;

async function _runTemplate(inputPath: string, outputPath: string) {
  inputPath = path.resolve(__dirname, inputPath);
  outputPath = path.resolve(__dirname, outputPath);

  console.info(`Building ${path.relative(path.dirname(__dirname), outputPath)}...`);

  // TODO(ESM): Consider making this an actual import statement.
  const { COMMIT_TYPES, ScopeRequirement } = await new Function(
    `return import('@angular/ng-dev');`,
  )();

  const monorepo = JSON.parse(fs.readFileSync('./.monorepo.json', 'utf-8'));
  const content = lodash.template(fs.readFileSync(inputPath, 'utf-8'))({
    monorepo,
    packages: releasePackages.map(({ name }) => name),
    encode: (x: string) => global.encodeURIComponent(x),
    // Pass-through `ng-dev` ESM commit message information for the `contributing.ejs`
    // template. EJS templates using the devkit template cannot use ESM.
    COMMIT_TYPES: COMMIT_TYPES,
    ScopeRequirement: ScopeRequirement,
  });
  fs.writeFileSync(outputPath, content, 'utf-8');
}

export default async function (_options: {}): Promise<number> {
  await Promise.all([
    _runTemplate('./templates/readme.ejs', '../README.md'),
    _runTemplate('./templates/contributing.ejs', '../CONTRIBUTING.md'),
  ]);

  return 0;
}
