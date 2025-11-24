/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Host } from '../host';

/**
 * A mock implementation of the `Host` interface for testing purposes.
 * This class allows spying on host methods and controlling their return values.
 */
export class MockHost implements Host {
  runCommand = jasmine.createSpy('runCommand').and.resolveTo({ logs: [] });
  stat = jasmine.createSpy('stat');
  existsSync = jasmine.createSpy('existsSync');
  readFile = jasmine.createSpy('readFile').and.resolveTo('');
  glob = jasmine.createSpy('glob').and.returnValue((async function* () {})());
  resolveModule = jasmine.createSpy('resolveRequest').and.returnValue('/dev/null');
  spawn = jasmine.createSpy('spawn');
  getAvailablePort = jasmine.createSpy('getAvailablePort');
}
