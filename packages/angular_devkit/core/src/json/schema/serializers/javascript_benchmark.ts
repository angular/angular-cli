/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
import { benchmark } from '@_/benchmark';
import { SchemaClassFactory } from '@ngtools/json-schema';
import * as fs from 'fs';
import * as path from 'path';
import { JsonSchemaRegistry } from '../registry';
import { JsonSchema } from '../schema';
import { JavascriptSerializer } from './javascript';

describe('JavaScript Serializer', () => {
  // Schema for the Angular-CLI config.
  const jsonPath = path.join(
    (global as any)._DevKitRoot,
    'tests/@angular_devkit/core/json/schema/serializers/schema_benchmark.json',
  );
  const jsonContent = fs.readFileSync(jsonPath).toString();
  const complexSchema: JsonSchema = JSON.parse(jsonContent);

  const registry = new JsonSchemaRegistry();
  registry.addSchema('', complexSchema);

  benchmark('schema parsing', () => {
    new JavascriptSerializer().serialize('', registry)({});
  }, () => {
    const SchemaMetaClass = SchemaClassFactory<any>(complexSchema);
    const schemaClass = new SchemaMetaClass({});
    schemaClass.$$root();
  });

  (function() {
    const registry = new JsonSchemaRegistry();
    registry.addSchema('', complexSchema);
    const coreRoot = new JavascriptSerializer().serialize('', registry)({});

    const SchemaMetaClass = SchemaClassFactory<any>(complexSchema);
    const schemaClass = new SchemaMetaClass({});
    const ngtoolsRoot = schemaClass.$$root();

    benchmark('schema access', () => {
      coreRoot.project = { name: 'abc' };
    }, () => {
      ngtoolsRoot.project = { name: 'abc' };
    });
  })();
});
