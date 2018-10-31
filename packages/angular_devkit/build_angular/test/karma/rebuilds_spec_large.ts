/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { debounceTime, take, tap } from 'rxjs/operators';
import { host, karmaTargetSpec } from '../utils';

describe('Karma Builder watch mode', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', async () => {
    const overrides = { watch: true };
    const res = await runTargetSpec(host, karmaTargetSpec, overrides).pipe(
      debounceTime(500),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      take(1),
    ).toPromise();

    expect(res).toEqual({ success: true });
  }, 30000);
});
