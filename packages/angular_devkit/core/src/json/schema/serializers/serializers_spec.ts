/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
import * as fs from 'fs';
import * as path from 'path';
import { JsonSchemaRegistry } from '../registry';

describe('serializers', () => {
  const devkitRoot = (global as any)._DevKitRoot;
  const root = path.join(devkitRoot, 'tests/@angular_devkit/core/json/schema/serializers');
  const allFiles = fs.readdirSync(root);
  const schemas = allFiles.filter(x => x.match(/^\d+\.schema\.json$/));

  for (const schemaName of schemas) {
    // tslint:disable-next-line:non-null-operator
    const schemaN = schemaName.match(/^\d+/) ![0] || '0';
    const schema = JSON.parse(fs.readFileSync(path.join(root, schemaName)).toString());

    const serializers = allFiles.filter(x => {
      return x.startsWith(schemaN + '.') && x.match(/^\d+\.\d+\..*_spec\.[jt]s$/);
    });

    for (const serializerName of serializers) {
      // tslint:disable-next-line:non-null-operator
      const [, indexN, serializerN] = serializerName.match(/^\d+\.(\d+)\.(.*)_spec/) !;
      const serializer = require(path.join(root, serializerName));

      const registry = new JsonSchemaRegistry();

      for (const fnName of Object.keys(serializer)) {
        if (typeof serializer[fnName] != 'function') {
          continue;
        }

        it(`${JSON.stringify(serializerN)} (${schemaN}.${indexN}.${fnName})`, () => {
          serializer[fnName](registry, schema);
        });
      }
    }
  }
});
