/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderOutput } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { Schema } from './schema';

export type PrerenderBuilderOptions = Schema & json.JsonObject;

export type PrerenderBuilderOutput = BuilderOutput;
