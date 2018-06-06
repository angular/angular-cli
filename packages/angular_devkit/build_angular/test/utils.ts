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
const workspaceRoot = join(devkitRoot, 'tests/@angular_devkit/build_angular/hello-world-app/');
export const host = new TestProjectHost(workspaceRoot);
export const outputPath = normalize('dist');

export const browserTargetSpec = { project: 'app', target: 'build' };
export const devServerTargetSpec = { project: 'app', target: 'serve' };
export const extractI18nTargetSpec = { project: 'app', target: 'extract-i18n' };
export const karmaTargetSpec = { project: 'app', target: 'test' };
export const tslintTargetSpec = { project: 'app', target: 'lint' };
export const protractorTargetSpec = { project: 'app-e2e', target: 'e2e' };

export enum Timeout {
  Basic = 30000,
  Standard = Basic * 1.5,
  Complex = Basic * 2,
  Massive = Basic * 4,
}
