/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder AOT', () => {
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const overrides = { aot: true };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(/platformBrowser.*bootstrapModuleFactory.*AppModuleNgFactory/);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('works with aliased imports', (done) => {
    const overrides = { aot: true };

    host.writeMultipleFiles({
      'src/app/app.component.ts': `import { Component } from '@angular/core';
       import { from as fromPromise } from 'rxjs';

       @Component({
         selector: 'app-root',
         templateUrl: './app.component.html',
         styleUrls: ['./app.component.css']
       })
       export class AppComponent {
         title = 'app-component';

         constructor() {
           console.log(fromPromise(Promise.resolve('test')));
         }
       }`,
    });

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        // if the aliased import was dropped this won't be rewired to a webpack module.
        expect(content).toMatch(/rxjs__WEBPACK_IMPORTED_.+[\"from\"]/);
        expect(content).not.toContain('fromPromise');
      }),
    ).toPromise().then(done, done.fail);
  });

  it('works with aliased imports from an exported object literal', (done) => {
    const overrides = { aot: true };

    host.writeMultipleFiles({
      'src/foo.ts': `
        import { from as fromPromise } from 'rxjs';
        export { fromPromise };
      `,
      'src/app/app.component.ts': `
      import { Component } from '@angular/core';
      import { fromPromise } from '../foo';

       @Component({
         selector: 'app-root',
         templateUrl: './app.component.html',
         styleUrls: ['./app.component.css']
       })
       export class AppComponent {
         title = 'app-component';

         constructor() {
           console.log(fromPromise(Promise.resolve('test')));
         }
       }`,
    });

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        // if the aliased import was dropped this won't be rewired to a webpack module.
        expect(content).toMatch(/rxjs__WEBPACK_IMPORTED_.+[\"from\"]/);
        expect(content).toMatch(/rxjs__WEBPACK_IMPORTED_.+[\"fromPromise\"]/);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('works with aliased imports from an alias export', (done) => {
    const overrides = { aot: true };

    host.writeMultipleFiles({
      'src/foo.ts': `
        export { from as fromPromise } from 'rxjs';
      `,
      'src/app/app.component.ts': `
      import { Component } from '@angular/core';
      import { fromPromise } from '../foo';

       @Component({
         selector: 'app-root',
         templateUrl: './app.component.html',
         styleUrls: ['./app.component.css']
       })
       export class AppComponent {
         title = 'app-component';

         constructor() {
           console.log(fromPromise(Promise.resolve('test')));
         }
       }`,
    });

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        // if the aliased import was dropped this won't be rewired to a webpack module.
        expect(content).toMatch(/rxjs__WEBPACK_IMPORTED_.+[\"from\"]/);
        expect(content).toMatch(/rxjs__WEBPACK_IMPORTED_.+[\"fromPromise\"]/);
      }),
    ).toPromise().then(done, done.fail);
  });

});
