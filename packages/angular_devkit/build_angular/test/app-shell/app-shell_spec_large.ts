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

  const targetSpec = { project: 'app', target: 'app-shell' };

  it('works (basic)', done => {
    host.replaceInFile('src/app/app.module.ts', /    BrowserModule/, `
      BrowserModule.withServerTransition({ appId: 'some-app' })
    `);

    runTargetSpec(host, targetSpec, {}, DefaultTimeout * 2).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = 'dist/index.html';
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(/Welcome to app!/);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('works with route', done => {
    host.writeMultipleFiles({
      'src/app/app-shell/app-shell.component.html': `
        <p>
          app-shell works!
        </p>
      `,
      'src/app/app-shell/app-shell.component.ts': `
        import { Component, OnInit } from '@angular/core';

        @Component({
          selector: 'app-app-shell',
          templateUrl: './app-shell.component.html',
        })
        export class AppShellComponent implements OnInit {

          constructor() { }

          ngOnInit() {
          }

        }
      `,
      'src/app/app.module.ts': `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';

        import { AppRoutingModule } from './app-routing.module';
        import { AppComponent } from './app.component';
        import { environment } from '../environments/environment';
        import { RouterModule } from '@angular/router';

        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [
            BrowserModule.withServerTransition({ appId: 'serverApp' }),
            AppRoutingModule,
            RouterModule
          ],
          providers: [],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `,
      'src/app/app.server.module.ts': `
        import { NgModule } from '@angular/core';
        import { ServerModule } from '@angular/platform-server';

        import { AppModule } from './app.module';
        import { AppComponent } from './app.component';
        import { Routes, RouterModule } from '@angular/router';
        import { AppShellComponent } from './app-shell/app-shell.component';

        const routes: Routes = [ { path: 'shell', component: AppShellComponent }];

        @NgModule({
          imports: [
            AppModule,
            ServerModule,
            RouterModule.forRoot(routes),
          ],
          bootstrap: [AppComponent],
          declarations: [AppShellComponent],
        })
        export class AppServerModule {}
      `,
      'src/main.ts': `
        import { enableProdMode } from '@angular/core';
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
          enableProdMode();
        }

        document.addEventListener('DOMContentLoaded', () => {
          platformBrowserDynamic().bootstrapModule(AppModule)
          .catch(err => console.log(err));
        });
      `,
      'src/app/app-routing.module.ts': `
        import { NgModule } from '@angular/core';
        import { Routes, RouterModule } from '@angular/router';

        const routes: Routes = [];

        @NgModule({
          imports: [RouterModule.forRoot(routes)],
          exports: [RouterModule]
        })
        export class AppRoutingModule { }
      `,
      'src/app/app.component.html': `
        <router-outlet></router-outlet>
      `,
    });

    const overrides = { route: 'shell' };

    runTargetSpec(host, targetSpec, overrides, DefaultTimeout * 2).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = 'dist/index.html';
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toContain('app-shell works!');
      }),
    ).toPromise().then(done, done.fail);
  });
});
