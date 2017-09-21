/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonSchemaRegistry } from '../registry';


export abstract class JsonSchemaSerializer<T> {
  abstract serialize(ref: string, registry: JsonSchemaRegistry): T;
}
