/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { normalize, virtualFs } from '@angular-devkit/core';
import { createArchitect, host } from '../../testing/test-utils';

describe('AppShell Builder', () => {
  const target = { project: 'app', target: 'app-shell' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  const appShellRouteFiles = {
    'src/styles.css': `
      p { color: #000 }
    `,
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
      import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

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
  };

  it('works (basic)', async () => {
    host.replaceInFile(
      'src/app/app.module.ts',
      / {4}BrowserModule/,
      `
      BrowserModule.withServerTransition({ appId: 'some-app' })
    `,
    );

    const run = await architect.scheduleTarget(target);
    const output = await run.result;
    await run.stop();

    expect(output.success).toBe(true);

    const fileName = 'dist/index.html';
    const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
    expect(content).toMatch('Welcome to app');
    expect(content).toMatch('ng-server-context="app-shell"');
  });

  it('works with route', async () => {
    host.writeMultipleFiles(appShellRouteFiles);
    const overrides = { route: 'shell' };

    const run = await architect.scheduleTarget(target, overrides);
    const output = await run.result;
    await run.stop();

    expect(output.success).toBe(true);
    const fileName = 'dist/index.html';
    const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
    expect(content).toContain('app-shell works!');
  });

  it('critical CSS is inlined', async () => {
    host.writeMultipleFiles(appShellRouteFiles);
    const overrides = {
      route: 'shell',
      browserTarget: 'app:build:production,inline-critical-css',
    };

    const run = await architect.scheduleTarget(target, overrides);
    const output = await run.result;
    await run.stop();

    expect(output.success).toBe(true);
    const fileName = 'dist/index.html';
    const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));

    expect(content).toContain('app-shell works!');
    expect(content).toContain('p{color:#000}');
    expect(content).toMatch(
      /<link rel="stylesheet" href="styles\.[a-z0-9]+\.css" media="print" onload="this\.media='all'">/,
    );
  });
});
