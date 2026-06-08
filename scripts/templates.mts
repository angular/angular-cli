/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import lodash from 'lodash';
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { releasePackages } from './packages.mts';

const __dirname = import.meta.dirname;

async function runTemplate(inputPath: string, outputPath: string) {
  inputPath = path.resolve(__dirname, inputPath);
  outputPath = path.resolve(__dirname, outputPath);

  console.info(`Building ${path.relative(path.dirname(__dirname), outputPath)}...`);

  const { COMMIT_TYPES, ScopeRequirement } = await import('@angular/ng-dev');

  const [monorepoRaw, templateContent] = await Promise.all([
    readFile('./.monorepo.json', 'utf-8'),
    readFile(inputPath, 'utf-8'),
  ]);

  const monorepo = JSON.parse(monorepoRaw);
  const content = lodash.template(templateContent)({
    monorepo,
    packages: releasePackages.map(({ name }) => name),
    encode: (x: string) => encodeURIComponent(x),
    // Pass-through `ng-dev` ESM commit message information for the `contributing.ejs`
    // template. EJS templates using the devkit template cannot use ESM.
    COMMIT_TYPES: COMMIT_TYPES,
    ScopeRequirement: ScopeRequirement,
  });
  await writeFile(outputPath, content, 'utf-8');
}

export default async function (): Promise<number> {
  await Promise.all([
    runTemplate('./templates/readme.ejs', '../README.md'),
    runTemplate('./templates/contributing.ejs', '../CONTRIBUTING.md'),
  ]);

  return 0;
}
