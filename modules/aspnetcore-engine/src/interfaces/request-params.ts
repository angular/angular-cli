/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** @deprecated use `@nguniversal/common` instead. */
export interface IRequestParams {
  location: any; // e.g., Location object containing information '/some/path'
  origin: string; // e.g., 'https://example.com:1234'
  url: string; // e.g., '/some/path'
  baseUrl: string; // e.g., '' or '/myVirtualDir'
  absoluteUrl: string; // e.g., 'https://example.com:1234/some/path'
  domainTasks: Promise<any>;
  data: any; // any custom object passed through from .NET
}
