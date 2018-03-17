/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tap } from 'rxjs/operators';
import { TestProjectHost, browserWorkspaceTarget, runTargetSpec, workspaceRoot } from '../utils';


describe('Browser Builder no entry module', () => {
  const host = new TestProjectHost(workspaceRoot);

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    // Remove the bootstrap but keep a reference to AppModule so the import is not elided.
    host.replaceInFile('src/main.ts', /platformBrowserDynamic.*?bootstrapModule.*?;/, '');
    host.appendToFile('src/main.ts', 'console.log(AppModule);');

    const overrides = { baseHref: '/myUrl' };

    runTargetSpec(host, browserWorkspaceTarget, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
