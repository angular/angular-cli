/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import * as fs from 'fs';
import glob from 'glob';
import * as path from 'path';

export default async function (argv: {}, logger: logging.Logger) {
  const allJsonFiles = glob.sync('packages/**/*.json', {
    ignore: ['**/node_modules/**', '**/files/**', '**/*-files/**', '**/package.json'],
  });
  const dist = path.join(__dirname, '../dist-schema');

  const quicktypeRunner = require('../tools/quicktype_runner');
  logger.info('Removing dist-schema/...');
  fs.rmSync(dist, { force: true, recursive: true, maxRetries: 3 });

  logger.info('Generating JSON Schema....');

  for (const fileName of allJsonFiles) {
    if (
      fs.existsSync(fileName.replace(/\.json$/, '.ts')) ||
      fs.existsSync(fileName.replace(/\.json$/, '.d.ts'))
    ) {
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

    fs.mkdirSync(path.dirname(tsPath), { recursive: true });
    fs.writeFileSync(tsPath, tsContent, 'utf-8');
  }

  // Angular CLI config schema
  const cliJsonSchema = require('../tools/ng_cli_schema_generator');
  const inputPath = 'packages/angular/cli/lib/config/workspace-schema.json';
  const outputPath = path.join(dist, inputPath.replace('workspace-schema.json', 'schema.json'));
  cliJsonSchema.generate(inputPath, outputPath);
}
