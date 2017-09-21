/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '../../exception/exception';
import { JsonSchema } from './schema';


export class JsonSchemaNotFoundException extends BaseException {
  constructor(ref: string) { super(`Reference "${ref}" could not be found in registry.`); }
}


export class JsonSchemaRegistry {
  private _cache = new Map<string, JsonSchema>();

  constructor() {}

  addSchema(ref: string, schema: JsonSchema) {
    this._cache.set(ref, schema);
  }

  hasSchema(ref: string) {
    return this._cache.has(ref);
  }

  getSchemaFromRef(ref: string): JsonSchema {
    const schemaCache = this._cache.get(ref);

    if (!schemaCache) {
      throw new JsonSchemaNotFoundException(ref);
    }

    return schemaCache;
  }
}
