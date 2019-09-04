/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { Architect } from '@angular-devkit/architect/src/architect';
import { getSystemPath, join, normalize, virtualFs } from '@angular-devkit/core';
import * as express from 'express'; // tslint:disable-line:no-implicit-dependencies
import { createArchitect, host } from '../utils';

describe('AppShell Builder', () => {
  const target = { project: 'app', target: 'app-shell' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  const appShellRouteFiles = {
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
  };

  it('works (basic)', async () => {
    host.replaceInFile('src/app/app.module.ts', /    BrowserModule/, `
      BrowserModule.withServerTransition({ appId: 'some-app' })
    `);

    const run = await architect.scheduleTarget(target);
    const output = await run.result;
    await run.stop();

    expect(output.success).toBe(true);

    const fileName = 'dist/index.html';
    const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
    expect(content).toMatch(/Welcome to app!/);
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

  it('works with route and service-worker', async () => {
    host.writeMultipleFiles(appShellRouteFiles);
    host.writeMultipleFiles({
      'src/ngsw-config.json': `
        {
          "index": "/index.html",
          "assetGroups": [{
            "name": "app",
            "installMode": "prefetch",
            "resources": {
              "files": [
                "/favicon.ico",
                "/index.html",
                "/*.css",
                "/*.js"
              ]
            }
          }, {
            "name": "assets",
            "installMode": "lazy",
            "updateMode": "prefetch",
            "resources": {
              "files": [
                "/assets/**"
              ]
            }
          }]
        }
      `,
      'src/app/app.module.ts': `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';

        import { AppRoutingModule } from './app-routing.module';
        import { AppComponent } from './app.component';
        import { ServiceWorkerModule } from '@angular/service-worker';
        import { environment } from '../environments/environment';
        import { RouterModule } from '@angular/router';

        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [
            BrowserModule.withServerTransition({ appId: 'serverApp' }),
            AppRoutingModule,
            ServiceWorkerModule.register('/ngsw-worker.js', { enabled: environment.production }),
            RouterModule
          ],
          providers: [],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `,
      'e2e/app.e2e-spec.ts': `
        import { browser, by, element } from 'protractor';

        it('should have ngsw in normal state', () => {
          browser.get('/');
          // Wait for service worker to load.
          browser.sleep(2000);
          browser.waitForAngularEnabled(false);
          browser.get('/ngsw/state');
          // Should have updated, and be in normal state.
          expect(element(by.css('pre')).getText()).not.toContain('Last update check: never');
          expect(element(by.css('pre')).getText()).toContain('Driver state: NORMAL');
        });
      `,
    });
    // This should match the browser target prod config.
    host.replaceInFile(
      'angular.json',
      '"buildOptimizer": true',
      '"buildOptimizer": true, "serviceWorker": true',
    );

    // We're changing the workspace file so we need to recreate the Architect instance.
    architect = (await createArchitect(host.root())).architect;

    const overrides = { route: 'shell' };
    const run = await architect.scheduleTarget(
      { ...target, configuration: 'production' },
      overrides,
    );
    const output = await run.result;
    await run.stop();

    expect(output.success).toBe(true);

    // Make sure the index is pre-rendering the route.
    const fileName = 'dist/index.html';
    const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
    expect(content).toContain('app-shell works!');

    // Serve the app using a simple static server.
    const app = express();
    app.use('/', express.static(getSystemPath(join(host.root(), 'dist')) + '/'));
    const server = app.listen(4200);

    // Load app in protractor, then check service worker status.
    const protractorRun = await architect.scheduleTarget(
      { project: 'app-e2e', target: 'e2e' },
      { devServerTarget: undefined } as {},
    );
    const protractorOutput = await protractorRun.result;
    await protractorRun.stop();
    expect(protractorOutput.success).toBe(true);

    // Close the express server.
    server.close();
  });
});
