/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// TODO(dgp1130): These imports likely don't resolve in stricter package environments like `pnpm`, since they are resolved relative to
// `@angular-devkit/build-angular` rather than the user's workspace. Should look into virtual modules to support those use cases.

import { NgModule, provideZoneChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

@NgModule({
  providers: [typeof window.Zone !== 'undefined' ? provideZoneChangeDetection() : []],
})
class TestModule {}

getTestBed().initTestEnvironment([BrowserTestingModule, TestModule], platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
