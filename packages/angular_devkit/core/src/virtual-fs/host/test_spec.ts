/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { test } from './test';


// Yes, we realize the irony of testing a test host.
describe('TestHost', () => {

  it('can list files', () => {
    const files = {
      '/x/y/z': '',
      '/a': '',
      '/h': '',
      '/x/y/b': '',
    };

    const host = new test.TestHost(files);
    expect(host.files.sort() as string[]).toEqual(Object.keys(files).sort());
  });

});
