/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// TODO(dgp1130): These imports likely don't resolve in stricter package environments like `pnpm`, since they are resolved relative to
// `@angular-devkit/build-angular` rather than the user's workspace. Should look into virtual modules to support those use cases.

import { getTestBed } from '@angular/core/testing';
import { platformBrowser } from '@angular/platform-browser';
import { BrowserTestingModule } from '@angular/platform-browser/testing';

// TODO(alanagius): replace with `platformBrowserTesting` once https://github.com/angular/angular/pull/60480 is released.
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowser(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
