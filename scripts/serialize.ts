/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { classify, logging } from '@angular-devkit/core';
import { SchemaClassFactory } from '@ngtools/json-schema';
import * as fs from 'fs';


export function buildSchema(inFile: string, mimetype: string): string {
  const jsonSchema = JSON.parse(fs.readFileSync(inFile, 'utf-8'));
  const SchemaClass = SchemaClassFactory(jsonSchema);
  const schemaInstance = new SchemaClass({});

  let name = inFile.split(/[\/\\]/g).pop();
  if (name) {
    name = classify(name.replace(/\.[^.]*$/, ''));
  }

  const license = `/**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */

    `.replace(/^ {4}/gm, '');

  return license + schemaInstance.$$serialize(mimetype, name);
}


export default function(opts: { _: string[], mimetype?: string }, logger: logging.Logger) {
  const inFile = opts._[0] as string;
  const outFile = opts._[1] as string;
  const mimetype = opts.mimetype || 'text/x.dts';

  if (!inFile) {
    logger.fatal('Command serialize needs an input file.');
  } else {
    const output = buildSchema(inFile, mimetype);
    if (outFile) {
      fs.writeFileSync(outFile, output, { encoding: 'utf-8' });
    } else {
      logger.info(output);
    }
  }
}
