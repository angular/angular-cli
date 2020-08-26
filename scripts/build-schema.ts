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
import * as glob from 'glob';
import * as path from 'path';


function _mkdirp(p: string) {
  // Create parent folder if necessary.
  if (!fs.existsSync(path.dirname(p))) {
    _mkdirp(path.dirname(p));
  }
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p);
  }
}


function _rimraf(p: string) {
  glob.sync(path.join(p, '**/*'), { dot: true, nodir: true })
    .forEach(p => fs.unlinkSync(p));
  glob.sync(path.join(p, '**/*'), { dot: true })
    .sort((a, b) => b.length - a.length)
    .forEach(p => fs.rmdirSync(p));
}


export default async function(
  argv: { },
  logger: logging.Logger,
) {
  const allJsonFiles = glob.sync('packages/**/*.json', {
    ignore: [
      '**/node_modules/**',
      '**/files/**',
      '**/*-files/**',
      '**/package.json',
    ],
  });
  const dist = path.join(__dirname, '../dist-schema');

  const quicktypeRunner = require('../tools/quicktype_runner');
  logger.info('Removing dist-schema/...');
  _rimraf(dist);

  logger.info('Generating JSON Schema....');

  for (const fileName of allJsonFiles) {
    if (fs.existsSync(fileName.replace(/\.json$/, '.ts'))
      || fs.existsSync(fileName.replace(/\.json$/, '.d.ts'))) {
      // Skip files that already exist.
      continue;
    }
    const content = fs.readFileSync(fileName, 'utf-8');

    let json;
    try {
      json = JSON.parse(content);
      if (typeof json.$schema !== 'string' || !json.$schema.startsWith('http://json-schema.org/')) {
        // Skip non-schema files.
        continue;
      }
    } catch {
      // malformed or JSON5
      continue;
    }
    const tsContent = await quicktypeRunner.generate(fileName);
    const tsPath = path.join(dist, fileName.replace(/\.json$/, '.ts'));

    _mkdirp(path.dirname(tsPath));
    fs.writeFileSync(tsPath, tsContent, 'utf-8');
  }
}
