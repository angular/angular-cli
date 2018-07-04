/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { DefaultTimeout, runTargetSpec } from '@angular-devkit/architect/testing';
import { normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { host } from '../utils';


describe('AppShell Builder', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works (basic)', done => {
    host.replaceInFile('src/app/app.module.ts', /    BrowserModule/, `
      BrowserModule.withServerTransition({ appId: 'some-app' })
    `);
    host.writeMultipleFiles({
      'src/app/app.server.module.ts': `
        import { NgModule } from '@angular/core';
        import { ServerModule } from '@angular/platform-server';

        import { AppModule } from './app.module';
        import { AppComponent } from './app.component';

        @NgModule({
          imports: [
            AppModule,
            ServerModule,
          ],
          bootstrap: [AppComponent],
        })
        export class AppServerModule {}
      `,
    });

    runTargetSpec(host, { project: 'app', target: 'app-shell' }, DefaultTimeout * 2).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = 'dist/index.html';
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(/Welcome to app!/);
      }),
    ).toPromise().then(done, done.fail);
  });
});
