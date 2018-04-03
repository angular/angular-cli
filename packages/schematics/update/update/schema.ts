/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface UpdateSchema {
  packages?: string | string[];
  force: boolean;
  all: boolean;
  next: boolean;
  migrateOnly: boolean;
  from?: string;
  to?: string;
}
