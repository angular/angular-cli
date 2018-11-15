/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject } from '../interface';

/**
 * A specialized interface for JsonSchema (to come). JsonSchemas are also JsonObject.
 *
 * @public
 */
export type JsonSchema = JsonObject | boolean;
