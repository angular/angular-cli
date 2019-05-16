/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { TestProjectHost } from '@angular-devkit/architect/testing';
import { join, normalize } from '@angular-devkit/core';


const devkitRoot = normalize((global as any)._DevKitRoot); // tslint:disable-line:no-any
const basicWorkspaceRoot = join(devkitRoot, 'tests/angular_devkit/build_webpack/basic-app/');
export const basicHost = new TestProjectHost(basicWorkspaceRoot);
const angularWorkspaceRoot = join(devkitRoot, 'tests/angular_devkit/build_webpack/angular-app/');
export const angularHost = new TestProjectHost(angularWorkspaceRoot);
