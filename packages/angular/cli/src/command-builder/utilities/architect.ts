/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Target } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { json } from '@angular-devkit/core';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { getPackageManager } from '../../utilities/package-manager';
import { CommandContext, CommandModuleError } from '../command-module';
import { Option, parseJsonSchemaToOptions } from './json-schema';
